import { describe, expect, it } from "vitest";
import { CrmDirectory } from "../../services/enterprise-crm/src/directory.ts";

describe("P4C-02 customer read", () => {
  it("returns names for the caller tenant and no token", () => {
    const crm = new CrmDirectory();
    crm.add({ externalId: "c1", tenantId: "tenant-a", name: "Ada" });
    crm.add({ externalId: "c1", tenantId: "tenant-b", name: "Bea" });
    expect(crm.query("tenant-a", true)).toEqual([{ externalId: "c1", name: "Ada" }]);
    expect(() => crm.query("tenant-a", false)).toThrow(/acl/);
    expect(JSON.stringify(crm.query("tenant-a", true))).not.toContain("token");
  });
});
