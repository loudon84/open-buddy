import { createHash } from "node:crypto";

export function digest(bytes: string): string {
  return createHash("sha256").update(bytes).digest("hex");
}

export interface ReleaseInput {
  tenantId: string;
  bytes: string;
  declaredHash: string;
  permissions: string[];
  approved: boolean;
  signer: string;
  revokedKeys: string[];
  entries: Array<{ name: string; size: number }>;
}

export interface Release {
  tenantId: string;
  hash: string;
  permissions: string[];
  approved: boolean;
}

const maxEntry = 1_000_000;

export class PluginRegistry {
  private readonly releases: Release[] = [];

  publish(input: ReleaseInput): Release {
    const hash = digest(input.bytes);
    if (hash !== input.declaredHash) throw new Error("hash mismatch");
    if (input.revokedKeys.includes(input.signer)) throw new Error("key revoked");
    if (!input.approved) throw new Error("unapproved");
    if (input.bytes.includes("SECRET=")) throw new Error("secret in bundle");
    for (const entry of input.entries) {
      if (entry.name.includes("..") || entry.name.startsWith("/") || entry.size > maxEntry) {
        throw new Error("archive rejected");
      }
    }
    const release = { tenantId: input.tenantId, hash, permissions: [...input.permissions], approved: true };
    this.releases.push(release);
    return release;
  }

  install(callerTenantId: string, release: Release): Release {
    if (release.tenantId !== callerTenantId) throw new Error("cross-tenant release");
    return release;
  }

  addPermission(release: Release, permission: string): Release {
    return { ...release, permissions: [...release.permissions, permission], approved: false };
  }
}
