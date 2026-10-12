import { createHash, verify, type KeyObject } from "node:crypto";

export function digest(bytes: string | Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

export interface ReleaseManifest {
  id: string;
  version: string;
  permissions: string[];
}

export interface ReleaseFile {
  name: string;
  bytes: Uint8Array;
}

export interface ReleaseInput {
  tenantId: string;
  manifest: ReleaseManifest;
  files: ReleaseFile[];
  signature: { keyId: string; value: string };
}

export type ReleaseState = "pending-approval" | "approved";

export interface Release {
  releaseId: string;
  tenantId: string;
  manifest: ReleaseManifest;
  fileDigests: Array<{ name: string; sha256: string }>;
  signerKeyId: string;
  state: ReleaseState;
  approvedBy?: string;
}

export interface RegistryTrust {
  /** Publisher keys the registry operator trusts. Callers cannot add to this set. */
  publisherKeys: Map<string, KeyObject>;
  /** Actor ids allowed to approve releases, per tenant. */
  approvers: Map<string, Set<string>>;
}

const maxEntry = 1_000_000;

/** Bytes the publisher signs: canonical manifest plus the digest of every file, sorted by name. */
export function signingPayload(manifest: ReleaseManifest, files: ReleaseFile[]): Buffer {
  const canonical = {
    id: manifest.id,
    version: manifest.version,
    permissions: [...manifest.permissions].sort(),
    files: files.map((file) => ({ name: file.name, sha256: digest(file.bytes) })).sort((a, b) => a.name.localeCompare(b.name)),
  };
  return Buffer.from(JSON.stringify(canonical), "utf8");
}

export class PluginRegistry {
  private readonly releases = new Map<string, Release>();
  private readonly revokedKeys = new Set<string>();

  constructor(private readonly trust: RegistryTrust) {}

  revokeKey(keyId: string): void {
    this.revokedKeys.add(keyId);
  }

  publish(input: ReleaseInput): Release {
    const key = this.trust.publisherKeys.get(input.signature.keyId);
    if (!key) throw new Error("unknown signer");
    if (this.revokedKeys.has(input.signature.keyId)) throw new Error("key revoked");
    for (const file of input.files) {
      if (file.name.includes("..") || file.name.startsWith("/") || /^[A-Za-z]:/.test(file.name) || file.bytes.byteLength > maxEntry) {
        throw new Error("archive rejected");
      }
      if (Buffer.from(file.bytes).toString("utf8").includes("SECRET=")) throw new Error("secret in bundle");
    }
    const payload = signingPayload(input.manifest, input.files);
    if (!verify(null, payload, key, Buffer.from(input.signature.value, "base64"))) throw new Error("signature invalid");
    const releaseId = `${input.manifest.id}@${input.manifest.version}:${digest(payload)}`;
    const release: Release = {
      releaseId,
      tenantId: input.tenantId,
      manifest: { ...input.manifest, permissions: [...input.manifest.permissions] },
      fileDigests: input.files.map((file) => ({ name: file.name, sha256: digest(file.bytes) })),
      signerKeyId: input.signature.keyId,
      state: "pending-approval",
    };
    this.releases.set(releaseId, release);
    return { ...release };
  }

  approve(releaseId: string, approver: { tenantId: string; actorId: string }): Release {
    const release = this.releases.get(releaseId);
    if (!release || release.tenantId !== approver.tenantId) throw new Error("not found");
    if (!this.trust.approvers.get(approver.tenantId)?.has(approver.actorId)) throw new Error("approver not authorized");
    if (this.revokedKeys.has(release.signerKeyId)) throw new Error("key revoked");
    release.state = "approved";
    release.approvedBy = approver.actorId;
    return { ...release };
  }

  install(callerTenantId: string, releaseId: string): Release {
    const release = this.releases.get(releaseId);
    if (!release || release.tenantId !== callerTenantId) throw new Error("cross-tenant release");
    if (this.revokedKeys.has(release.signerKeyId)) throw new Error("key revoked");
    if (release.state !== "approved") throw new Error("unapproved");
    return { ...release };
  }
}
