import { describe, expect, it } from "vitest";
import { queryRelations } from "../../services/enterprise-ontology/src/catalog";

describe("P4E-02 relations", () => {
  it("reads relations inside the caller tenant only when the policy source grants the actor", () => {
    const rows = [
      { fromId: "a", toId: "b", tenantId: "tenant-a" },
      { fromId: "c", toId: "d", tenantId: "tenant-b" },
    ];
    const grants = (caller: { tenantId: string; actorId: string }) => caller.tenantId === "tenant-a" && caller.actorId === "alice";
    expect(queryRelations(rows, { tenantId: "tenant-a", actorId: "alice" }, grants)).toEqual([rows[0]]);
    expect(() => queryRelations(rows, { tenantId: "tenant-a", actorId: "mallory" }, grants)).toThrow(/acl/);
  });
});
