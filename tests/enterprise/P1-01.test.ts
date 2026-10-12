import { describe, expect, it } from "vitest";
import { AdapterRegistry } from "../../packages/runtime/openbuddy-runtime-adapter/src/adapter-registry";
import { LocalPiAdapter } from "../../electron/main/runtime/local-pi-adapter";

const localScope = {
  tenantId: "local:install-1",
  workspaceId: "local",
  actorId: "os-user",
};

describe("P1-01 LocalPiAdapter", () => {
  it("continues an existing jsonl session offline and refuses an enterprise scope", async () => {
    const writes: string[] = [];
    const port = {
      installationId: "install-1",
      async loadEntries(sessionPath: string) {
        expect(sessionPath).toBe("/sessions/old.jsonl");
        return [{ type: "session", id: "sess-old" }, { type: "message", role: "user" }];
      },
      async continueSession(sessionPath: string) {
        return { sessionId: "sess-old", sessionPath };
      },
      async send() {
        return { runId: "run-1" };
      },
      async abort() {
        return;
      },
      subscribe: () => () => {},
      async respondPermission() {},
      write() {
        writes.push("nope");
      },
    };
    const adapter = new LocalPiAdapter(port);

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

  it("streams host events with resume and delegates permission replies to the host", async () => {
    let emit: (event: { type?: string; [field: string]: unknown }) => void = () => {};
    const replies: Array<[string, string]> = [];
    const adapter = new LocalPiAdapter({
      installationId: "install-1",
      loadEntries: async () => [],
      continueSession: async (sessionPath: string) => ({ sessionId: "sess-old", sessionPath }),
      send: async () => ({ runId: "run-1" }),
      abort: async () => {},
      subscribe(listener) {
        emit = listener;
        return () => {
          emit = () => {};
        };
      },
      async respondPermission(requestId, decision) {
        replies.push([requestId, decision]);
      },
    });
    await adapter.connect({ endpointRef: "", credentialRef: "local", scope: localScope });
    const session = await adapter.openExisting("/sessions/old.jsonl", localScope);
    const context = { ...localScope, requestId: "r", idempotencyKey: "k" };

    await expect(adapter.resolveApproval(session, "perm-1", "approve", context)).rejects.toMatchObject({ code: "NOT_FOUND" });

    const controller = new AbortController();
    const seen: Array<{ seq: number; type: string }> = [];
    const reading = (async () => {
      for await (const event of adapter.stream(session, 0, { signal: controller.signal })) {
        seen.push({ seq: event.seq, type: event.type });
        if (seen.length === 2) controller.abort();
      }
    })();
    emit({ type: "agent_message_chunk", text: "hi" });
    emit({ type: "hook/permission-request", requestId: "perm-1", toolName: "bash" });
    await reading;
    expect(seen).toEqual([
      { seq: 1, type: "message.delta" },
      { seq: 2, type: "approval.required" },
    ]);

    expect(await adapter.resolveApproval(session, "perm-1", "reject", context)).toEqual({ accepted: true });
    expect(replies).toEqual([["perm-1", "reject"]]);
    await expect(adapter.resolveApproval(session, "perm-1", "approve", context)).rejects.toMatchObject({ code: "NOT_FOUND" });

    emit({ type: "aborted" });
    const resumed: number[] = [];
    const again = new AbortController();
    for await (const event of adapter.stream(session, 2, { signal: again.signal })) {
      resumed.push(event.seq);
      again.abort();
    }
    expect(resumed).toEqual([3]);
    await adapter.disconnect();
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
