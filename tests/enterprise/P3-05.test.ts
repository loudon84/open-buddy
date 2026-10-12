import { generateKeyPairSync, sign } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  PluginRegistry,
  signingPayload,
  type ReleaseFile,
  type ReleaseInput,
  type ReleaseManifest,
} from "../../services/enterprise-plugin-registry/src/catalog";

const publisher = generateKeyPairSync("ed25519");
const stranger = generateKeyPairSync("ed25519");
const encoder = new TextEncoder();

function signed(manifest: ReleaseManifest, files: ReleaseFile[], keyId = "publisher-1", privateKey = publisher.privateKey): ReleaseInput {
  return {
    tenantId: "tenant-a",
    manifest,
    files,
    signature: { keyId, value: sign(null, signingPayload(manifest, files), privateKey).toString("base64") },
  };
}

function registry(): PluginRegistry {
  return new PluginRegistry({
    publisherKeys: new Map([["publisher-1", publisher.publicKey]]),
    approvers: new Map([["tenant-a", new Set(["security-officer"])]]),
  });
}

const manifest: ReleaseManifest = { id: "sample", version: "1.0.0", permissions: ["plugin.session.read"] };
const files: ReleaseFile[] = [{ name: "index.js", bytes: encoder.encode("export default 1") }];

describe("P3-05 plugin registry", () => {
  it("installs only a release signed by a trusted key and approved by a listed approver", () => {
    const reg = registry();
    const release = reg.publish(signed(manifest, files));
    expect(release.state).toBe("pending-approval");
    expect(() => reg.install("tenant-a", release.releaseId)).toThrow(/unapproved/);
    expect(() => reg.approve(release.releaseId, { tenantId: "tenant-a", actorId: "plugin-author" })).toThrow(/approver/);
    expect(() => reg.approve(release.releaseId, { tenantId: "tenant-b", actorId: "security-officer" })).toThrow(/not found/);
    reg.approve(release.releaseId, { tenantId: "tenant-a", actorId: "security-officer" });
    expect(reg.install("tenant-a", release.releaseId).approvedBy).toBe("security-officer");
    expect(() => reg.install("tenant-b", release.releaseId)).toThrow(/cross-tenant/);
  });

  it("rejects self-made hashes, foreign keys, tampered files, and revoked signers", () => {
    const reg = registry();
    expect(() => reg.publish(signed(manifest, files, "attacker-key", stranger.privateKey))).toThrow(/unknown signer/);
    expect(() => reg.publish(signed(manifest, files, "publisher-1", stranger.privateKey))).toThrow(/signature/);
    const tampered = signed(manifest, files);
    tampered.files = [{ name: "index.js", bytes: encoder.encode("export default 2") }];
    expect(() => reg.publish(tampered)).toThrow(/signature/);
    const widened = signed(manifest, files);
    widened.manifest = { ...manifest, permissions: [...manifest.permissions, "plugin.tool.execute"] };
    expect(() => reg.publish(widened)).toThrow(/signature/);

    const release = reg.publish(signed(manifest, files));
    reg.approve(release.releaseId, { tenantId: "tenant-a", actorId: "security-officer" });
    reg.revokeKey("publisher-1");
    expect(() => reg.install("tenant-a", release.releaseId)).toThrow(/revoked/);
    expect(() => reg.publish(signed(manifest, files))).toThrow(/revoked/);
  });

  it("puts a release with more permissions back into approval", () => {
    const reg = registry();
    const first = reg.publish(signed(manifest, files));
    reg.approve(first.releaseId, { tenantId: "tenant-a", actorId: "security-officer" });
    const grown = reg.publish(signed({ ...manifest, version: "1.1.0", permissions: [...manifest.permissions, "plugin.tool.execute"] }, files));
    expect(grown.state).toBe("pending-approval");
    expect(() => reg.install("tenant-a", grown.releaseId)).toThrow(/unapproved/);
  });

  it("rejects secrets, path escapes, and oversized entries", () => {
    const reg = registry();
    expect(() => reg.publish(signed(manifest, [{ name: "env", bytes: encoder.encode("SECRET=value") }]))).toThrow(/secret/);
    expect(() => reg.publish(signed(manifest, [{ name: "../etc/passwd", bytes: encoder.encode("x") }]))).toThrow(/archive/);
    expect(() => reg.publish(signed(manifest, [{ name: "big.bin", bytes: new Uint8Array(2_000_000) }]))).toThrow(/archive/);
  });
});
