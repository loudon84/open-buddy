import { describe, expect, it } from "vitest";
import type { LocalPiPort } from "../../../electron/main/runtime/local-pi-adapter";
import { PiAdapter } from "../pi-adapter";

function port(): LocalPiPort & { installationId: string } {
  let listener: ((event: { type?: string; delta?: string }) => void) | null = null;
  return {
    installationId: "inst",
    async loadEntries() {
      return [];
    },
    async continueSession() {
      return { sessionId: "pi-session", sessionPath: "embedded-session" };
    },
    async send(text: string) {
      listener?.({ type: "agent_message_chunk", delta: `echo:${text}` });
      listener?.({ type: "turn_end" });
      return { runId: "run-pi" };
    },
    async abort() {},
    subscribe(next) {
      listener = next;
      return () => {
        listener = null;
      };
    },
    async respondPermission() {},
  };
}

describe("PiAdapter", () => {
  it("reports embedded health and aggregates streamed text", async () => {
    const adapter = new PiAdapter(port());
    await expect(adapter.health()).resolves.toMatchObject({ status: "healthy", endpoint: "embedded://pi", version: "embedded" });
    const capabilities = await adapter.listCapabilities();
    expect(capabilities.map((item) => item.id)).toContain("tools");
    await expect(adapter.chat({ text: "ping" })).resolves.toMatchObject({ text: "echo:ping" });
  });
});
