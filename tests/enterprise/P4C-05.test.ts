import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { CrmDirectory, crmFieldContract } from "../../services/enterprise-crm/src/directory";
import { createDraft } from "../../services/enterprise-crm/src/drafts";
import { CrmOutbox } from "../../services/enterprise-crm/src/outbox";

describe("P4C-05 CRM acceptance", () => {
  it("keeps the fixture chain short of a live CRM", () => {
    expect(crmFieldContract.probed).toBe(false);
    const crm = new CrmDirectory();
    crm.add({ externalId: "c1", tenantId: "tenant-a", name: "Ada" });
    const draft = createDraft({ tenantId: "tenant-a", source: { kind: "knowledge", id: "doc", tenantId: "tenant-a" }, text: crm.query("tenant-a", true)[0].name });
    expect(draft.committed).toBe(false);
    const row = new CrmOutbox().commit({
      tenantId: "tenant-a",
      key: "k",
      bodyHash: "h",
      approval: { id: "apr", tenantId: "tenant-a", bodyHash: "h", decision: "approve" },
    });
    expect(row.state).toBe("pending");
    expect(readFileSync("scripts/enterprise/crm-smoke.mjs", "utf8")).toContain("process.exit(2)");
  });
});
