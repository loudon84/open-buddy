import { describe, expect, it } from "vitest";
import { LocalPiAdapter, type LocalPiPort } from "../local-pi-adapter";

function port(): LocalPiPort & { installationId: string } {
  return {
    installationId: "desktop",
    bound: true,
    async loadEntries() { return []; },
    async continueSession() { return { sessionId: "s", sessionPath: "s.jsonl" }; },
    async send() { return { runId: "run-1" }; },
    async abort() {},
    subscribe() { return () => undefined; },
    async respondPermission() {},
  };
}

describe("LocalPiAdapter cancel", () => {
  it("rejects a run id that is not current", async () => {
    const adapter = new LocalPiAdapter(port());
    await adapter.connect({ endpointRef: "embedded://pi", credentialRef: "", scope: { tenantId: "local:desktop", workspaceId: "local", actorId: "local" } });
    await adapter.sendMessage({
      tenantId: "local:desktop",
      workspaceId: "local",
      actorId: "local",
      requestId: "req",
      idempotencyKey: "req",
      sessionId: "s",
      text: "hi",
      artifactIds: [],
    });
    await expect(adapter.cancel(
      { tenantId: "local:desktop", workspaceId: "local", actorId: "local", sessionId: "s", agentInstanceId: "local-pi", runtimeId: "local-pi:desktop" },
      "other-run",
      { tenantId: "local:desktop", workspaceId: "local", actorId: "local", requestId: "req2", idempotencyKey: "req2" },
    )).rejects.toThrow(/NOT_FOUND|not current/);
  });
});
