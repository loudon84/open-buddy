import { readFileSync, writeFileSync } from "node:fs";

export interface InstanceCapabilities {
  resume: boolean;
  cancel: boolean;
  approvals: boolean;
  tools: boolean;
  tasks: boolean;
  artifacts: boolean;
}

export interface InstanceRow {
  tenantId: string;
  workspaceId: string;
  agentInstanceId: string;
  upstreamUrl: string;
  capabilities: InstanceCapabilities;
}

export interface SessionRow {
  sessionId: string;
  tenantId: string;
  workspaceId: string;
  actorId: string;
  agentInstanceId: string;
  upstreamUrl: string;
  status: string;
}

interface Snapshot {
  agentInstances: InstanceRow[];
  sessions: SessionRow[];
}

/**
 * File-backed route table. Columns match migrations/001_routes.sql.
 * node:sqlite is not loaded here because the Vitest graph cannot import it.
 */
export class RouteStore {
  constructor(private readonly dbPath: string) {
    this.write(this.read());
  }

  saveInstance(row: InstanceRow): void {
    const snapshot = this.read();
    const index = snapshot.agentInstances.findIndex((item) => item.tenantId === row.tenantId && item.agentInstanceId === row.agentInstanceId);
    if (index >= 0) snapshot.agentInstances[index] = row;
    else snapshot.agentInstances.push(row);
    this.write(snapshot);
  }

  findInstance(tenantId: string, agentInstanceId: string): InstanceRow | null {
    return this.read().agentInstances.find((item) => item.tenantId === tenantId && item.agentInstanceId === agentInstanceId) ?? null;
  }

  saveSession(row: SessionRow): void {
    const snapshot = this.read();
    snapshot.sessions.push(row);
    this.write(snapshot);
  }

  findSession(sessionId: string): SessionRow | null {
    return this.read().sessions.find((item) => item.sessionId === sessionId) ?? null;
  }

  close(): void {}

  private read(): Snapshot {
    try {
      return JSON.parse(readFileSync(this.dbPath, "utf8")) as Snapshot;
    } catch {
      return { agentInstances: [], sessions: [] };
    }
  }

  private write(snapshot: Snapshot): void {
    writeFileSync(this.dbPath, JSON.stringify(snapshot));
  }
}
