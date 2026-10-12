import { SessionProjection, type ProjectionEvent } from "../../../packages/runtime/openbuddy-workspace/src/session-projection";

export class SessionCoordinator {
  constructor(readonly projection = new SessionProjection()) {}

  open(sessionId: string, runtimeId: string): void {
    this.projection.open(sessionId, runtimeId);
  }

  apply(event: ProjectionEvent) {
    return this.projection.apply(event);
  }

  onStreamExpired(sessionId: string, snapshot: { cursor: number; text: string }): void {
    this.projection.replaceFromSnapshot(sessionId, snapshot);
  }
}
