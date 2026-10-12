export class DirectoryConflict extends Error {
  readonly status = 409;
  constructor(message: string) {
    super(message);
    this.name = "DirectoryConflict";
  }
}

export interface WorkspaceRecord {
  id: string;
  tenantId: string;
  name: string;
  revision: number;
}

export interface AgentRecord {
  id: string;
  tenantId: string;
  status: "provisioning" | "ready" | "failed";
  reason: string;
  revision: number;
}

export class DirectoryApi {
  private readonly workspaces = new Map<string, WorkspaceRecord>();
  private readonly agents = new Map<string, AgentRecord>();
  private readonly receipts = new Map<string, AgentRecord>();

  createWorkspace(record: { id: string; tenantId: string; name: string }): WorkspaceRecord {
    const stored = { ...record, revision: 1 };
    this.workspaces.set(record.id, stored);
    return stored;
  }

  updateWorkspace(id: string, ifMatch: number, name: string): WorkspaceRecord {
    const current = this.workspaces.get(id);
    if (!current) throw new Error("not found");
    if (current.revision !== ifMatch) throw new DirectoryConflict("revision mismatch");
    const next = { ...current, name, revision: current.revision + 1 };
    this.workspaces.set(id, next);
    return next;
  }

  getWorkspace(id: string): WorkspaceRecord | undefined {
    return this.workspaces.get(id);
  }

  changeRole(actorRole: string, nextRole: string): void {
    if (actorRole === "member" && nextRole !== "member") {
      throw new Error("member cannot promote");
    }
  }

  provisionAgent(key: string, input: { id: string; tenantId: string; fail?: boolean }): AgentRecord {
    const existing = this.receipts.get(key);
    if (existing) return existing;
    const record: AgentRecord = {
      id: input.id,
      tenantId: input.tenantId,
      status: input.fail ? "failed" : "ready",
      reason: input.fail ? "upstream health check failed" : "registered",
      revision: 1,
    };
    this.agents.set(input.id, record);
    this.receipts.set(key, record);
    return record;
  }
}
