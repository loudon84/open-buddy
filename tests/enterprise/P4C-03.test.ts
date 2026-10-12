import { describe, expect, it } from "vitest";
import { createDraft } from "../../services/enterprise-crm/src/drafts.ts";

describe("P4C-03 CRM drafts", () => {
  it("keeps a browser or knowledge source uncommitted", () => {
    const draft = createDraft({ tenantId: "tenant-a", source: { kind: "knowledge", id: "doc-1", tenantId: "tenant-a" }, text: "note" });
    expect(draft).toEqual({ committed: false, sourceId: "doc-1", text: "note" });
    expect(() => createDraft({ tenantId: "tenant-a", source: { kind: "browser", id: "page-1", tenantId: "tenant-b" }, text: "note" })).toThrow(/tenant/);
  });
});
