import { randomUUID } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";

export { CommandLog } from "./command-log";

export interface UpstreamEvent {
  seq: number;
  type: string;
  runId: string | null;
  payload: unknown;
}

export interface StoredEvent {
  eventId: string;
  seq: number;
  runId: string | null;
  type: string;
  occurredAt: string;
  payload: unknown;
}

interface SessionLog {
  upstreamCursor: number;
  events: StoredEvent[];
}

/**
 * Per-session event log with gateway-owned sequence numbers. Upstream events at or below the
 * stored upstream cursor are ignored, so a replayed upstream page does not duplicate events.
 */
export class SessionEventStore {
  constructor(private readonly path: string) {
    this.write(this.read());
  }

  upstreamCursor(sessionId: string): number {
    return this.read()[sessionId]?.upstreamCursor ?? 0;
  }

  /** Appends upstream events in order and returns the gateway events that were stored. */
  ingest(sessionId: string, events: UpstreamEvent[], accept: (event: UpstreamEvent) => boolean): StoredEvent[] {
    const snapshot = this.read();
    const log = snapshot[sessionId] ?? { upstreamCursor: 0, events: [] };
    const stored: StoredEvent[] = [];
    for (const event of [...events].sort((a, b) => a.seq - b.seq)) {
      if (event.seq <= log.upstreamCursor) continue;
      log.upstreamCursor = event.seq;
      if (!accept(event)) continue;
      const next: StoredEvent = {
        eventId: randomUUID(),
        seq: (log.events.at(-1)?.seq ?? 0) + 1,
        runId: event.runId,
        type: event.type,
        occurredAt: new Date().toISOString(),
        payload: event.payload,
      };
      log.events.push(next);
      stored.push(next);
    }
    snapshot[sessionId] = log;
    this.write(snapshot);
    return stored;
  }

  after(sessionId: string, afterSeq: number): StoredEvent[] {
    return (this.read()[sessionId]?.events ?? []).filter((event) => event.seq > afterSeq);
  }

  private read(): Record<string, SessionLog> {
    try {
      return JSON.parse(readFileSync(this.path, "utf8")) as Record<string, SessionLog>;
    } catch {
      return {};
    }
  }

  private write(snapshot: Record<string, SessionLog>): void {
    writeFileSync(this.path, JSON.stringify(snapshot));
  }
}
