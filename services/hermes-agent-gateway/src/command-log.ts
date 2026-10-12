import { readFileSync, writeFileSync } from "node:fs";

export interface StoredReceipt {
  runId: string;
  status: "accepted";
  bodyHash: string;
}

export type Terminal = "cancelled" | "completed" | "failed";

interface Snapshot {
  receipts: Record<string, StoredReceipt>;
  seq: number;
  events: Array<{ seq: number; runId: string; type: string }>;
  terminals: Record<string, Terminal>;
  approvals: Record<string, { expiresAt: number; paramsHash: string; decision?: "approve" | "reject" }>;
  reconciliation: Array<{ id: string; detail: unknown }>;
  tails?: never;
}

export class CommandConflict extends Error {
  readonly status = 409;
  constructor(message: string) {
    super(message);
    this.name = "CommandConflict";
  }
}

export interface CommandScope {
  tenantId: string;
  workspaceId: string;
  operation: string;
  resourceId: string;
}

export class CommandInvalid extends Error {
  readonly status = 400;
  constructor(message: string) {
    super(message);
    this.name = "CommandInvalid";
  }
}

export class CommandLog {
  private tails = new Map<string, Promise<void>>();

  constructor(private readonly path: string) {
    this.write(this.read());
  }

  async execute<T extends { runId: string }>(
    scope: CommandScope,
    idempotencyKey: string,
    bodyHash: string,
    create: () => Promise<T>,
  ): Promise<T & { status: "accepted" }> {
    if (!idempotencyKey) throw new CommandInvalid("idempotency key is required");
    for (const part of [scope.tenantId, scope.workspaceId, scope.operation, scope.resourceId]) {
      if (!part) throw new CommandInvalid("command scope is incomplete");
    }
    const key = JSON.stringify([scope.tenantId, scope.workspaceId, scope.operation, scope.resourceId, idempotencyKey]);
    const existing = this.read().receipts[key];
    if (existing) {
      if (existing.bodyHash !== bodyHash) throw new CommandConflict("idempotency key reused with a different body");
      return { runId: existing.runId, status: "accepted" } as T & { status: "accepted" };
    }
    const created = await create();
    const snapshot = this.read();
    if (snapshot.receipts[key]) {
      if (snapshot.receipts[key].bodyHash !== bodyHash) throw new CommandConflict("idempotency key reused with a different body");
      return { runId: snapshot.receipts[key].runId, status: "accepted" } as T & { status: "accepted" };
    }
    snapshot.receipts[key] = { runId: created.runId, status: "accepted", bodyHash };
    snapshot.seq += 1;
    snapshot.events.push({ seq: snapshot.seq, runId: created.runId, type: "run.accepted" });
    this.write(snapshot);
    return { ...created, status: "accepted" };
  }

  terminalOf(runId: string): Terminal | null {
    return this.read().terminals[runId] ?? null;
  }

  async finish(runId: string, terminal: Terminal): Promise<Terminal> {
    const previous = this.tails.get(runId) ?? Promise.resolve();
    let release: () => void = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    this.tails.set(runId, previous.then(() => gate));
    await previous;
    try {
      const snapshot = this.read();
      const current = snapshot.terminals[runId];
      if (current) return current;
      snapshot.terminals[runId] = terminal;
      snapshot.seq += 1;
      snapshot.events.push({ seq: snapshot.seq, runId, type: `run.${terminal}` });
      this.write(snapshot);
      return terminal;
    } finally {
      release();
    }
  }

  decide(input: { id: string; now: number; paramsHash: string; decision: "approve" | "reject" }): void {
    const snapshot = this.read();
    const approval = snapshot.approvals[input.id];
    if (!approval) throw new CommandConflict("unknown approval");
    if (input.now >= approval.expiresAt) throw new CommandConflict("approval expired");
    if (input.paramsHash !== approval.paramsHash) throw new CommandConflict("approval parameters changed");
    if (approval.decision) throw new CommandConflict("approval already decided");
    approval.decision = input.decision;
    snapshot.seq += 1;
    snapshot.events.push({ seq: snapshot.seq, runId: input.id, type: "approval.resolved" });
    this.write(snapshot);
  }

  openApproval(input: { id: string; expiresAt: number; paramsHash: string }): void {
    const snapshot = this.read();
    if (snapshot.approvals[input.id]) return;
    snapshot.approvals[input.id] = { expiresAt: input.expiresAt, paramsHash: input.paramsHash };
    this.write(snapshot);
  }

  recordUnknown(id: string, detail: unknown): void {
    const snapshot = this.read();
    snapshot.reconciliation.push({ id, detail });
    this.write(snapshot);
  }

  listEvents(): Array<{ seq: number; runId: string; type: string }> {
    return this.read().events;
  }

  reconciliation(): Array<{ id: string; detail: unknown }> {
    return this.read().reconciliation;
  }

  private read(): Snapshot {
    try {
      const parsed = JSON.parse(readFileSync(this.path, "utf8")) as Snapshot;
      return {
        receipts: parsed.receipts ?? {},
        seq: parsed.seq ?? 0,
        events: parsed.events ?? [],
        terminals: parsed.terminals ?? {},
        approvals: parsed.approvals ?? {},
        reconciliation: parsed.reconciliation ?? [],
      };
    } catch {
      return { receipts: {}, seq: 0, events: [], terminals: {}, approvals: {}, reconciliation: [] };
    }
  }

  private write(snapshot: Snapshot): void {
    writeFileSync(this.path, JSON.stringify(snapshot));
  }
}
