import { createHash } from "node:crypto";

export interface ObjectType {
  name: string;
  schemaVersion: number;
  tenantId: string;
}

export class ObjectCatalog {
  private readonly types: ObjectType[] = [];

  register(type: ObjectType): void {
    const current = this.types.find((item) => item.name === type.name && item.tenantId === type.tenantId);
    if (current && type.schemaVersion < current.schemaVersion) throw new Error("schema");
    this.types.push(type);
  }

  list(tenantId: string): ObjectType[] {
    return this.types.filter((type) => type.tenantId === tenantId);
  }
}

export interface Relation {
  fromId: string;
  toId: string;
  tenantId: string;
}

export interface Caller {
  tenantId: string;
  actorId: string;
}

export function queryRelations(rows: Relation[], caller: Caller, grants: (caller: Caller) => boolean): Relation[] {
  if (!grants(caller)) throw new Error("acl");
  return rows.filter((row) => row.tenantId === caller.tenantId);
}

export interface QuoteLine {
  sku: string;
  quantity: number;
  unitPrice: number;
}

export interface Quote {
  id: string;
  tenantId: string;
  lines: QuoteLine[];
  digest: string;
  prepared: boolean;
  committed: boolean;
  compensated: boolean;
  approvedBy?: string;
}

export interface QuoteApproval {
  quoteId: string;
  tenantId: string;
  digest: string;
  approverId: string;
  decision: "approve" | "reject";
}

export class QuoteBook {
  private readonly quotes = new Map<string, Quote>();

  constructor(private readonly trust: { approvers: Map<string, Set<string>> }) {}

  prepare(input: { tenantId: string; id: string; lines: QuoteLine[] }): Quote {
    const key = JSON.stringify([input.tenantId, input.id]);
    if (this.quotes.has(key)) throw new Error("quote already prepared");
    const lines = input.lines.map((line) => ({ ...line }));
    const digest = createHash("sha256").update(JSON.stringify([input.tenantId, input.id, lines])).digest("hex");
    const quote: Quote = { id: input.id, tenantId: input.tenantId, lines, digest, prepared: true, committed: false, compensated: false };
    this.quotes.set(key, quote);
    return { ...quote };
  }

  commit(tenantId: string, id: string, approval: QuoteApproval): Quote | null {
    const quote = this.quotes.get(JSON.stringify([tenantId, id]));
    if (!quote) return null;
    if (quote.committed || quote.compensated) throw new Error("quote already settled");
    const trusted =
      approval.decision === "approve" &&
      approval.quoteId === quote.id &&
      approval.tenantId === quote.tenantId &&
      approval.digest === quote.digest &&
      (this.trust.approvers.get(quote.tenantId)?.has(approval.approverId) ?? false);
    if (trusted) {
      quote.committed = true;
      quote.approvedBy = approval.approverId;
    } else {
      quote.compensated = true;
    }
    return { ...quote };
  }
}
