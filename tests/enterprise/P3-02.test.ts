import { describe, expect, it } from "vitest";
import { EnterpriseBroker } from "../../packages/runtime/openbuddy-plugin-host/src/tool-registration.ts";

describe("P3-02 plugin broker", () => {
  it("rechecks the grant at call time and refuses a direct Hermes URL", () => {
    const broker = new EnterpriseBroker(["mcp.example"]);
    expect(() => broker.register({
      id: "tool-1",
      permission: "plugin.tool.execute",
      manifestPermissions: ["plugin.tool.execute"],
      grants: [],
      resourceAcl: ["plugin.tool.execute"],
      tenantId: "tenant-a",
    })).toThrow(/not granted/);

    const tool = broker.register({
      id: "tool-2",
      permission: "plugin.tool.execute",
      manifestPermissions: ["plugin.tool.execute"],
      grants: ["plugin.tool.execute"],
      resourceAcl: ["plugin.tool.execute"],
      tenantId: "tenant-a",
    });
    expect(tool.call({ tenantId: "tenant-a", permission: "plugin.tool.execute" })).toEqual({ ok: true });
    expect(() => tool.call({ tenantId: "tenant-b", permission: "plugin.tool.execute" })).toThrow(/fake scope/);
    expect(() => tool.call({ tenantId: "tenant-a", permission: "token" })).toThrow(/token/);
    expect(() => tool.call({ tenantId: "tenant-a", permission: "plugin.tool.execute", signal: { aborted: true } })).toThrow(/cancelled/);
    expect(broker.inflight("tool-2")).toBe(0);
    tool.dispose();
    expect(() => tool.call({ tenantId: "tenant-a", permission: "plugin.tool.execute" })).toThrow(/disposed/);
    expect(() => broker.connectMcp("https://hermes.example/mcp")).toThrow(/hermes/);
    expect(() => broker.connectMcp("https://evil.example/mcp")).toThrow(/mcp url/);
    expect(() => broker.connectMcp("https://mcp.example/mcp")).not.toThrow();
  });
});
