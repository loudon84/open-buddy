import { describe, expect, it } from "vitest";
import { ObjectCatalog } from "../../services/enterprise-ontology/src/catalog";

describe("P4E-01 object catalog", () => {
  it("rejects an older schema for the same object", () => {
    const catalog = new ObjectCatalog();
    catalog.register({ name: "quote", schemaVersion: 2, tenantId: "tenant-a" });
    expect(() => catalog.register({ name: "quote", schemaVersion: 1, tenantId: "tenant-a" })).toThrow(/schema/);
    expect(catalog.list("tenant-b")).toEqual([]);
  });
});
