import { describe, expect, it } from "vitest";
import { queryRelations } from "../../services/enterprise-ontology/src/catalog.ts";

describe("P4E-02 relations", () => {
  it("returns relations only for the caller tenant", () => {
    const rows = [
      { fromId: "q1", toId: "c1", tenantId: "tenant-a" },
      { fromId: "q1", toId: "c1", tenantId: "tenant-b" },
    ];
    expect(queryRelations(rows, "tenant-a", true)).toEqual([rows[0]]);
    expect(() => queryRelations(rows, "tenant-a", false)).toThrow(/acl/);
  });
});
