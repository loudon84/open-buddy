import { describe, expect, it } from "vitest";
import { digest, PluginRegistry } from "../../services/enterprise-plugin-registry/src/catalog.ts";

describe("P3-05 plugin registry", () => {
  it("rejects a tampered bundle and clears approval when permissions grow", () => {
    const registry = new PluginRegistry();
    const bytes = "plugin-bytes";
    const release = registry.publish({
      tenantId: "tenant-a",
      bytes,
      declaredHash: digest(bytes),
      permissions: ["plugin.session.read"],
      approved: true,
      signer: "key-1",
      revokedKeys: [],
      entries: [{ name: "index.js", size: 10 }],
    });
    expect(registry.install("tenant-a", release).hash).toBe(digest(bytes));
    expect(() => registry.install("tenant-b", release)).toThrow(/cross-tenant/);
    expect(() => registry.publish({ ...base(bytes), declaredHash: "nope" })).toThrow(/hash/);
    expect(() => registry.publish({ ...base(bytes), signer: "key-1", revokedKeys: ["key-1"] })).toThrow(/revoked/);
    expect(() => registry.publish({ ...base(bytes), approved: false })).toThrow(/unapproved/);
    expect(() => registry.publish({ ...base("SECRET=value"), bytes: "SECRET=value", declaredHash: digest("SECRET=value") })).toThrow(/secret/);
    expect(() => registry.publish({ ...base(bytes), entries: [{ name: "../etc/passwd", size: 1 }] })).toThrow(/archive/);
    expect(() => registry.publish({ ...base(bytes), entries: [{ name: "big.bin", size: 2_000_000 }] })).toThrow(/archive/);
    expect(registry.addPermission(release, "plugin.tool.execute").approved).toBe(false);
  });
});

function base(bytes: string) {
  return {
    tenantId: "tenant-a",
    bytes,
    declaredHash: digest(bytes),
    permissions: ["plugin.session.read"],
    approved: true,
    signer: "key-2",
    revokedKeys: [] as string[],
    entries: [{ name: "index.js", size: 10 }],
  };
}
