import { describe, expect, it } from "vitest";
import { AdapterRegistry } from "../../packages/runtime/openbuddy-runtime-adapter/src/adapter-registry.ts";
import { LocalPiAdapter } from "../../electron/main/runtime/local-pi-adapter.ts";

const localScope = {
  tenantId: "local:install-1",
  workspaceId: "local",
  actorId: "os-user",
};

describe("P1-01 LocalPiAdapter", () => {
  it("continues an existing jsonl session offline and refuses an enterprise scope", async () => {
    const writes: string[] = [];
    const adapter = new LocalPiAdapter({
      installationId: "install-1",
      async loadEntries(sessionPath) {
        expect(sessionPath).toBe("/sessions/old.jsonl");
        return [{ type: "session", id: "sess-old" }, { type: "message", role: "user" }];
      },
      async continueSession(sessionPath) {
        return { sessionId: "sess-old", sessionPath };
      },
      async send() {
        return { runId: "run-1" };
      },
      async abort() {
        return;
      },
      write() {
        writes.push("nope");
      },
    });

    const capabilities = await adapter.connect({
      endpointRef: "",
      credentialRef: "local",
      scope: localScope,
    });
    expect(capabilities.kind).toBe("local-pi");
    expect(capabilities.runtimeId).toBe("local-pi:install-1");

    const session = await adapter.openExisting("/sessions/old.jsonl", localScope);
    expect(session.sessionId).toBe("sess-old");
    expect(session.runtimeId).toBe("local-pi:install-1");
    expect(writes).toEqual([]);

    const receipt = await adapter.sendMessage({
      ...localScope,
      requestId: "req-1",
      idempotencyKey: "key-1",
      sessionId: "sess-old",
      text: "hello",
      artifactIds: [],
    });
    expect(receipt.status).toBe("accepted");

    expect(adapter.mapHostEvent({ type: "tool_call", toolCall: { id: "t1", name: "read" } }).type).toBe("tool.started");
    expect(adapter.mapHostEvent({ type: "hook/permission-request", toolName: "bash" }).type).toBe("approval.required");
    expect(adapter.mapHostEvent({ type: "error", message: "boom" }).type).toBe("run.failed");

    const cancelled = await adapter.cancel(
      { ...localScope, sessionId: "sess-old", agentInstanceId: "local-pi", runtimeId: "local-pi:install-1" },
      "run-1",
      { ...localScope, requestId: "req-2", idempotencyKey: "key-2" },
    );
    expect(cancelled.accepted).toBe(true);
    expect(adapter.mapHostEvent({ type: "aborted" }).type).toBe("run.cancelled");

    await expect(
      adapter.connect({
        endpointRef: "https://hermes.example",
        credentialRef: "secret",
        scope: { tenantId: "tenant-a", workspaceId: "w", actorId: "u" },
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("does not select a fixture adapter as the production default", () => {
    const registry = new AdapterRegistry();
    registry.register({ id: "fixture", kind: "local-pi", fixture: true });
    expect(() => registry.resolveDefault()).toThrow(/fixture/);
    registry.register({ id: "local-pi", kind: "local-pi", fixture: false });
    expect(registry.resolveDefault().id).toBe("local-pi");
    expect(registry.resolveDefault().kind).not.toBe("remote-hermes");
  });
});
