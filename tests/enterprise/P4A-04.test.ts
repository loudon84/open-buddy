import { describe, expect, it } from "vitest";
import { resolvePreview } from "../../packages/capability/openbuddy-file-preview/src/resolve.ts";

describe("P4A-04 preview contract", () => {
  it("denies the wrong tenant, a revoked handle, and a remote local path", () => {
    const now = 100;
    expect(resolvePreview({ provider: "knowledge", tenantId: "a", ownerTenantId: "a", revoked: false, expiresAt: 200, ref: "doc:1" }, now).ref).toBe("doc:1");
    expect(() => resolvePreview({ provider: "http", tenantId: "a", ownerTenantId: "b", revoked: false, expiresAt: 200, ref: "doc:1" }, now)).toThrow(/cross-tenant/);
    expect(() => resolvePreview({ provider: "http", tenantId: "a", ownerTenantId: "a", revoked: true, expiresAt: 200, ref: "doc:1" }, now)).toThrow(/revoked/);
    expect(() => resolvePreview({ provider: "http", tenantId: "a", ownerTenantId: "a", revoked: false, expiresAt: 100, ref: "doc:1" }, now)).toThrow(/expired/);
    expect(() => resolvePreview({ provider: "http", tenantId: "a", ownerTenantId: "a", revoked: false, expiresAt: 200, ref: "C:\\secret" }, now)).toThrow(/local path/);
    expect(resolvePreview({ provider: "local", tenantId: "a", ownerTenantId: "a", revoked: false, expiresAt: 200, ref: "C:\\notes.txt" }, now).ref).toContain("notes");
  });
});
