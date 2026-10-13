import type { IdentityContext, RuntimeResponse } from "../../../packages/runtime-core/src/index";

export interface PromptDispatch {
  activeRuntimeId: string;
  text: string;
  sessionId?: string;
  identityContext?: IdentityContext;
  promptPi: () => Promise<void>;
  chatActive: () => Promise<RuntimeResponse>;
  publishAssistant: (turn: { sessionId: string; text: string; traceId: string }) => void;
}

export async function dispatchPrompt(input: PromptDispatch): Promise<{ ok: true }> {
  if (input.activeRuntimeId === "pi") {
    await input.promptPi();
    return { ok: true };
  }
  const response = await input.chatActive();
  input.publishAssistant({
    sessionId: input.sessionId ?? response.sessionId,
    text: response.text,
    traceId: response.traceId,
  });
  return { ok: true };
}
