import { describe, expect, it } from "vitest";
import { EnterpriseBroker } from "../../packages/runtime/openbuddy-plugin-host/src/tool-registration";

const owner = { tenantId: "tenant-a", workspaceId: "ws-a", actorId: "user-1" };

describe("P3-02 plugin broker", () => {
  it("runs the registered handler only while the caller still holds the registered permission", async () => {
    const granted = new Map<string, string[]>([["user-1", ["crm.customer.read"]]]);
    const broker = new EnterpriseBroker(["mcp.example"], (scope) => granted.get(scope.actorId) ?? []);
    const seen: unknown[] = [];

    expect(() => broker.register({
      id: "undeclared",
      permission: "crm.customer.read",
      manifestPermissions: [],
      resourceAcl: ["crm.customer.read"],
      owner,
      handler: async () => "x",
    })).toThrow(/not declared/);
    expect(() => broker.register({
      id: "write",
      permission: "crm.customer.write",
      manifestPermissions: ["crm.customer.write"],
      resourceAcl: ["crm.customer.write"],
      owner,
      handler: async () => "x",
    })).toThrow(/not granted/);

    const tool = broker.register({
      id: "read",
      permission: "crm.customer.read",
      manifestPermissions: ["crm.customer.read"],
      resourceAcl: ["crm.customer.read"],
      owner,
      handler: async (input, context) => {
        seen.push({ input, actorId: context.actorId });
        return { customers: ["Ada"] };
      },
    });
    await expect(tool.call({ scope: owner, input: { q: "A" } })).resolves.toEqual({ ok: true, value: { customers: ["Ada"] } });
    expect(seen).toEqual([{ input: { q: "A" }, actorId: "user-1" }]);

    await expect(tool.call({ scope: { ...owner, tenantId: "tenant-b" }, input: {} })).rejects.toThrow(/fake scope/);
    await expect(tool.call({ scope: { ...owner, workspaceId: "ws-b" }, input: {} })).rejects.toThrow(/fake scope/);
    await expect(tool.call({ scope: { ...owner, actorId: "user-2" }, input: {} })).rejects.toThrow(/revoked/);

    granted.set("user-1", []);
    await expect(tool.call({ scope: owner, input: {} })).rejects.toThrow(/revoked/);
    expect(seen).toHaveLength(1);
  });

  it("propagates handler errors and cancellation, and stops after dispose", async () => {
    const broker = new EnterpriseBroker(["mcp.example"], () => ["plugin.tool.execute"]);
    const failing = broker.register({
      id: "failing",
      permission: "plugin.tool.execute",
      manifestPermissions: ["plugin.tool.execute"],
      resourceAcl: ["plugin.tool.execute"],
      owner,
      handler: async () => {
        throw new Error("crm unavailable");
      },
    });
    await expect(failing.call({ scope: owner, input: {} })).rejects.toThrow(/crm unavailable/);

    let observedAbort = false;
    const slow = broker.register({
      id: "slow",
      permission: "plugin.tool.execute",
      manifestPermissions: ["plugin.tool.execute"],
      resourceAcl: ["plugin.tool.execute"],
      owner,
      handler: (_input, context) =>
        new Promise((resolve) => {
          context.signal.addEventListener("abort", () => {
            observedAbort = true;
            resolve("late");
          });
        }),
    });
    const controller = new AbortController();
    const pending = slow.call({ scope: owner, input: {}, signal: controller.signal });
    expect(broker.inflight("slow")).toBe(1);
    controller.abort();
    await expect(pending).rejects.toThrow(/cancelled/);
    expect(observedAbort).toBe(true);
    expect(broker.inflight("slow")).toBe(0);

    slow.dispose();
    await expect(slow.call({ scope: owner, input: {} })).rejects.toThrow(/disposed/);
    expect(() => broker.connectMcp("https://hermes.example/mcp")).toThrow(/hermes/);
    expect(() => broker.connectMcp("https://evil.example/mcp")).toThrow(/mcp url/);
    expect(() => broker.connectMcp("https://mcp.example/mcp")).not.toThrow();
  });

  it("fails a handler that runs past the timeout", async () => {
    const broker = new EnterpriseBroker([], () => ["plugin.tool.execute"], 20);
    const hung = broker.register({
      id: "hung",
      permission: "plugin.tool.execute",
      manifestPermissions: ["plugin.tool.execute"],
      resourceAcl: ["plugin.tool.execute"],
      owner,
      handler: () => new Promise(() => {}),
    });
    await expect(hung.call({ scope: owner, input: {} })).rejects.toThrow(/timed out/);
  });
});
