export interface OutboxRow {
  key: string;
  tenantId: string;
  bodyHash: string;
  remoteId?: string;
}

export class CrmOutbox {
  readonly rows: OutboxRow[] = [];

  commit(input: { tenantId: string; key: string; bodyHash: string; approved: boolean }): OutboxRow {
    if (!input.approved) throw new Error("approval");
    const existing = this.rows.find((row) => row.key === input.key);
    if (existing) {
      if (existing.bodyHash !== input.bodyHash) throw new Error("conflict");
      return existing;
    }
    const row: OutboxRow = { key: input.key, tenantId: input.tenantId, bodyHash: input.bodyHash };
    this.rows.push(row);
    return row;
  }

  reconcile(remoteIds: string[]): string[] {
    return this.rows.filter((row) => !remoteIds.includes(row.key)).map((row) => row.key);
  }
}
