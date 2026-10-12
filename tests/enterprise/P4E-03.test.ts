import { describe, expect, it } from "vitest";
import { QuoteBook } from "../../services/enterprise-ontology/src/catalog";

const lines = [{ sku: "A-1", quantity: 2, unitPrice: 100 }];

describe("P4E-03 quote prepare and commit", () => {
  it("commits only with an authorized approval for the same tenant and quote digest", () => {
    const book = new QuoteBook({ approvers: new Map([["tenant-a", new Set(["mgr"])]]) });
    const quote = book.prepare({ tenantId: "tenant-a", id: "q1", lines });
    const approval = { quoteId: "q1", tenantId: "tenant-a", digest: quote.digest, approverId: "mgr", decision: "approve" as const };

    expect(book.commit("tenant-a", "q1", { ...approval, approverId: "intern" })).toMatchObject({ committed: false, compensated: true });
    const other = book.prepare({ tenantId: "tenant-a", id: "q2", lines });
    expect(book.commit("tenant-a", "q2", { ...approval, quoteId: "q2", digest: "stale" })).toMatchObject({ compensated: true });
    expect(other.committed).toBe(false);

    const fresh = book.prepare({ tenantId: "tenant-a", id: "q3", lines });
    expect(book.commit("tenant-b", "q3", { ...approval, quoteId: "q3", digest: fresh.digest })).toBeNull();
    expect(book.commit("tenant-a", "q3", { ...approval, quoteId: "q3", tenantId: "tenant-b", digest: fresh.digest })).toMatchObject({
      compensated: true,
    });

    const good = book.prepare({ tenantId: "tenant-a", id: "q4", lines });
    expect(book.commit("tenant-a", "q4", { ...approval, quoteId: "q4", digest: good.digest })).toMatchObject({
      committed: true,
      approvedBy: "mgr",
    });
    expect(() => book.commit("tenant-a", "q4", { ...approval, quoteId: "q4", digest: good.digest })).toThrow(/already/);
  });
});
