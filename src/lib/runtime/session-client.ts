import { piCancel, piSend } from "@/lib/agent/pi-client";
import { invoke } from "@/lib/platform/electron-api";
import { getSelectedRuntimeId } from "./selected-runtime";

export { getSelectedRuntimeId, setSelectedRuntimeId } from "./selected-runtime";

export async function sendRuntimeTurn(sessionId: string, text: string): Promise<unknown> {
  if (getSelectedRuntimeId() === "local-pi") return piSend(sessionId, text);
  await invoke("runtime-session:create", { uiSessionId: sessionId, runtimeId: getSelectedRuntimeId() });
  return invoke("agent:prompt", { sessionId, text });
}

export async function cancelRuntimeTurn(sessionId: string): Promise<unknown> {
  return piCancel(sessionId);
}
