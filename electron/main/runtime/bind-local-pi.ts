import { readFile } from "node:fs/promises";
import type { PiSessionRuntime } from "../agent/pi-session-runtime.ts";
import { readPiJsonl, type LocalPiPort } from "./local-pi-adapter.ts";

/**
 * Binds the existing PiSessionRuntime without rewriting its JSONL history.
 * Continue and send stay on the host that already owns the session file.
 */
export function bindLocalPiRuntime(
  runtime: PiSessionRuntime,
  host: {
    continueSession(sessionPath: string): Promise<{ sessionId: string; sessionPath: string }>;
    send(text: string): Promise<{ runId: string }>;
  },
): LocalPiPort {
  return {
    loadEntries: readPiJsonl,
    continueSession: host.continueSession,
    send: host.send,
    async abort() {
      await runtime.dispose({ abort: true });
    },
  };
}

export async function jsonlBytes(sessionPath: string): Promise<Buffer> {
  return readFile(sessionPath);
}
