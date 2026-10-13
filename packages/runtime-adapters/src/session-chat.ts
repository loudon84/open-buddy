import { randomUUID } from "node:crypto";
import type { RuntimeRequest, RuntimeResponse } from "../../runtime-core/src/index";
import type {
  CallOptions,
  ConnectionConfig,
  RequestContext,
  RuntimeEvent,
  Scope,
  Session,
} from "../../../packages/runtime/openbuddy-runtime-adapter/src/types";

export interface SessionEngine {
  connect(config: ConnectionConfig, options?: CallOptions): Promise<{ features: Record<string, boolean> }>;
  disconnect(options?: CallOptions): Promise<void>;
  createSession(input: RequestContext & { agentInstanceId: string }, options?: CallOptions): Promise<Session>;
  sendMessage(
    input: RequestContext & { sessionId: string; text: string; artifactIds: string[] },
    options?: CallOptions,
  ): Promise<{ traceId: string }>;
  stream(ref: Session, afterSeq: number, options?: CallOptions): AsyncIterable<RuntimeEvent>;
}

function textOf(event: RuntimeEvent): string {
  const payload = event.payload;
  if (!payload || typeof payload !== "object") return "";
  const record = payload as Record<string, unknown>;
  if (typeof record.delta === "string") return record.delta;
  if (typeof record.text === "string") return record.text;
  return "";
}

function isTerminal(event: RuntimeEvent): boolean {
  if (event.type === "run.completed" || event.type === "run.failed" || event.type === "run.cancelled") return true;
  const payload = event.payload;
  if (!payload || typeof payload !== "object") return false;
  const kind = (payload as { type?: unknown }).type;
  return kind === "turn_end" || kind === "agent_end" || kind === "message_end" || kind === "agent_settled";
}

export async function collectChat(
  engine: SessionEngine,
  scope: Scope,
  agentInstanceId: string,
  endpointRef: string,
  request: RuntimeRequest,
): Promise<RuntimeResponse> {
  const requestId = randomUUID();
  const context: RequestContext = { ...scope, requestId, idempotencyKey: requestId };
  await engine.connect({ endpointRef, credentialRef: "", scope });
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 2000);
  let finished = false;
  try {
    const session = await engine.createSession({ ...context, agentInstanceId });
    const receipt = await engine.sendMessage({
      ...context,
      sessionId: request.sessionId ?? session.sessionId,
      text: request.text,
      artifactIds: [],
    });
    let text = "";
    let failed = false;
    for await (const event of engine.stream(session, 0, { signal: controller.signal })) {
      if (event.type === "message.delta") text += textOf(event);
      if (event.type === "run.failed" || event.type === "run.cancelled") failed = true;
      if (isTerminal(event)) {
        finished = true;
        controller.abort();
        break;
      }
    }
    if (!finished) throw new Error("runtime chat timed out");
    if (failed) throw new Error("runtime chat failed");
    return { sessionId: session.sessionId, text, traceId: receipt.traceId || requestId };
  } finally {
    clearTimeout(timer);
    await engine.disconnect().catch(() => undefined);
  }
}

export function capabilityList(features: Record<string, boolean>): Array<{ id: string; name: string }> {
  return Object.entries(features)
    .filter(([, enabled]) => enabled)
    .map(([id]) => ({ id, name: id }));
}
