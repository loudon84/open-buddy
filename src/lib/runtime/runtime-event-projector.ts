export interface ProjectedRuntimeEvent {
  uiSessionId: string;
  seq: number;
  type: string;
  payload: unknown;
}

export interface RuntimeProjection {
  messages: string[];
  phase: string;
}

export function projectRuntimeEvents(events: ProjectedRuntimeEvent[]): Map<string, RuntimeProjection> {
  const seen = new Set<string>();
  const views = new Map<string, RuntimeProjection>();
  for (const event of events) {
    const key = `${event.uiSessionId}:${event.seq}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const view = views.get(event.uiSessionId) ?? { messages: [], phase: "idle" };
    if (event.type === "message.delta") {
      const delta = (event.payload as { delta?: unknown } | null)?.delta;
      if (typeof delta === "string") view.messages.push(delta);
      view.phase = "running";
    } else if (event.type === "approval.required") view.phase = "waiting";
    else if (event.type === "run.completed") view.phase = "completed";
    else if (event.type === "run.failed") view.phase = "failed";
    else if (event.type === "run.cancelled") view.phase = "cancelled";
    else if (event.type.startsWith("tool.")) view.phase = "running";
    views.set(event.uiSessionId, view);
  }
  return views;
}
