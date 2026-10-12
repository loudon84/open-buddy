import { readFile } from "node:fs/promises";
import type { PiSessionRuntime } from "../agent/pi-session-runtime";
import { readPiJsonl, type LocalPiPort } from "./local-pi-adapter";

/**
 * Binds the existing PiSessionRuntime without rewriting its JSONL history.
 * Continue, send, events, and permission replies stay on the host that already owns the session.
 * PiSessionRuntime.subscribe holds a single handler, so the host fans its events out here.
 */
export function bindLocalPiRuntime(
  runtime: PiSessionRuntime,
  host: Pick<LocalPiPort, "continueSession" | "send" | "subscribe" | "respondPermission">,
): LocalPiPort {
  return {
    loadEntries: readPiJsonl,
    continueSession: host.continueSession,
    send: host.send,
    subscribe: host.subscribe,
    respondPermission: host.respondPermission,
    async abort() {
      await runtime.session?.abort();
    },
  };
}

export async function jsonlBytes(sessionPath: string): Promise<Buffer> {
  return readFile(sessionPath);
}
