export interface ProjectionEvent {
  sessionId: string;
  runtimeId: string;
  seq: number;
  type: "message.delta" | "run.completed";
  payload: string;
}

export interface ApplyResult {
  applied: boolean;
  gap: boolean;
  mixed: boolean;
}

interface SessionState {
  runtimeId: string;
  cursor: number;
  text: string;
  seen: number[];
}

/**
 * Scope-partitioned session projection.
 * A 410 from the stream is represented by replaceFromSnapshot.
 */
export class SessionProjection {
  private readonly sessions = new Map<string, SessionState>();

  open(sessionId: string, runtimeId: string): void {
    if (this.sessions.has(sessionId)) return;
    this.sessions.set(sessionId, { runtimeId, cursor: 0, text: "", seen: [] });
  }

  apply(event: ProjectionEvent): ApplyResult {
    const state = this.sessions.get(event.sessionId);
    if (!state) throw new Error("unknown session");
    if (state.runtimeId !== event.runtimeId) return { applied: false, gap: false, mixed: true };
    if (state.seen.includes(event.seq)) return { applied: false, gap: false, mixed: false };
    if (event.seq !== state.cursor + 1) return { applied: false, gap: true, mixed: false };
    state.seen.push(event.seq);
    state.cursor = event.seq;
    if (event.type === "message.delta") state.text += event.payload;
    return { applied: true, gap: false, mixed: false };
  }

  replaceFromSnapshot(sessionId: string, snapshot: { cursor: number; text: string }): void {
    const state = this.sessions.get(sessionId);
    if (!state) throw new Error("unknown session");
    state.cursor = snapshot.cursor;
    state.text = snapshot.text;
    state.seen = Array.from({ length: snapshot.cursor }, (_value, index) => index + 1);
  }

  text(sessionId: string): string {
    return this.sessions.get(sessionId)?.text ?? "";
  }

  runtimeId(sessionId: string): string | undefined {
    return this.sessions.get(sessionId)?.runtimeId;
  }

  idsForRuntime(runtimeId: string): string[] {
    return [...this.sessions.entries()].filter(([, state]) => state.runtimeId === runtimeId).map(([id]) => id);
  }
}
