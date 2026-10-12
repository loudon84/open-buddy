export type OutboxState = "pending" | "committed" | "unknown";

export interface OutboxRow {
  key: string;
  tenantId: string;
  bodyHash: string;
  approvalId: string;
  state: OutboxState;
  remoteId?: string;
}

export interface ApprovalRecord {
  id: string;
  tenantId: string;
  bodyHash: string;
  decision: "approve" | "reject";
}

function scoped(tenantId: string, key: string): string {
  if (!tenantId || !key) throw new Error("tenant and idempotency key are required");
  return JSON.stringify([tenantId, key]);
}

export class CrmOutbox {
  private readonly rows = new Map<string, OutboxRow>();

  commit(input: { tenantId: string; key: string; bodyHash: string; approval: ApprovalRecord | null }): OutboxRow {
    const approval = input.approval;
    if (!approval || approval.decision !== "approve" || approval.tenantId !== input.tenantId || approval.bodyHash !== input.bodyHash) {
      throw new Error("approval does not cover this write");
    }
    const ref = scoped(input.tenantId, input.key);
    const existing = this.rows.get(ref);
    if (existing) {
      if (existing.bodyHash !== input.bodyHash) throw new Error("conflict");
      return existing;
    }
    const row: OutboxRow = { key: input.key, tenantId: input.tenantId, bodyHash: input.bodyHash, approvalId: approval.id, state: "pending" };
    this.rows.set(ref, row);
    return row;
  }

  async dispatch(tenantId: string, key: string, send: (row: OutboxRow) => Promise<{ remoteId: string }>): Promise<OutboxRow> {
    const row = this.require(tenantId, key);
    if (row.state !== "pending") return row;
    try {
      const receipt = await send(row);
      row.remoteId = receipt.remoteId;
      row.state = "committed";
    } catch {
      row.state = "unknown";
    }
    return row;
  }

  /** `lookup` must query the CRM by the idempotency key it was sent with, not by local row ids. */
  async reconcile(tenantId: string, lookup: (key: string) => Promise<string | null>): Promise<OutboxRow[]> {
    for (const row of this.list(tenantId)) {
      if (row.state !== "unknown") continue;
      const remoteId = await lookup(row.key);
      if (remoteId) {
        row.remoteId = remoteId;
        row.state = "committed";
      } else {
        row.state = "pending";
      }
    }
    return this.list(tenantId).filter((row) => row.state !== "committed");
  }

  list(tenantId: string): OutboxRow[] {
    return [...this.rows.values()].filter((row) => row.tenantId === tenantId);
  }

  private require(tenantId: string, key: string): OutboxRow {
    const row = this.rows.get(scoped(tenantId, key));
    if (!row) throw new Error("not found");
    return row;
  }
}
