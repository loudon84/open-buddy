import { describe, expect, it } from "vitest";
import { ObjectCatalog, queryRelations } from "../../services/enterprise-ontology/src/catalog";

describe("P4E-04 ontology security", () => {
  it("does not list another tenant object or relation", () => {
    const catalog = new ObjectCatalog();
    catalog.register({ name: "quote", schemaVersion: 1, tenantId: "tenant-a" });
    expect(catalog.list("tenant-b")).toEqual([]);
    expect(queryRelations([{ fromId: "a", toId: "b", tenantId: "tenant-a" }], { tenantId: "tenant-b", actorId: "u" }, () => true)).toEqual([]);
  });
});
