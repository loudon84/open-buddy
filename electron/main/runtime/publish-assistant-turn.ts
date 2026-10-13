import { emitRendererEvent } from "../agent/host-modules/_surface/renderer-event-emitter";

export function publishAssistantTurn(turn: { sessionId: string; text: string; traceId: string }): void {
  const blockId = `platform-${turn.traceId}`;
  emitRendererEvent("pi://update", {
    sessionId: turn.sessionId,
    type: "agent_message_chunk",
    traceId: turn.traceId,
    content: [{ type: "text_start", id: blockId, contentIndex: 0 }],
  });
  emitRendererEvent("pi://update", {
    sessionId: turn.sessionId,
    type: "agent_message_chunk",
    traceId: turn.traceId,
    content: [{ type: "text_delta", id: blockId, text: turn.text }],
  });
  emitRendererEvent("pi://update", {
    sessionId: turn.sessionId,
    type: "agent_message_chunk",
    traceId: turn.traceId,
    content: [{ type: "text_end", id: blockId, text: turn.text, contentIndex: 0 }],
  });
  emitRendererEvent("pi://complete", {
    sessionId: turn.sessionId,
    traceId: turn.traceId,
    stopReason: "end_turn",
  });
}
