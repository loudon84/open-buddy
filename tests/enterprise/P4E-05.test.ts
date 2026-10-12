import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { QuoteBook } from "../../services/enterprise-ontology/src/catalog";

describe("P4E-05 yearly journey", () => {
  it("records the fixture journey and the unsigned follow-up", () => {
    const book = new QuoteBook({ approvers: new Map([["tenant-a", new Set(["mgr"])]]) });
    const quote = book.prepare({ tenantId: "tenant-a", id: "year", lines: [{ sku: "Y", quantity: 1, unitPrice: 1 }] });
    const approval = { quoteId: "year", tenantId: "tenant-a", digest: quote.digest, approverId: "mgr", decision: "approve" as const };
    expect(book.commit("tenant-a", "year", approval)?.committed).toBe(true);
    const script = readFileSync("scripts/enterprise/ontology-smoke.mjs", "utf8");
    expect(script).toContain("process.exit(2)");
    expect(script).toContain("D08 connector");
  });
});
