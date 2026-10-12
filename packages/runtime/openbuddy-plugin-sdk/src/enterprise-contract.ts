export interface Disposable {
  dispose(): void;
}

export interface EnterpriseManifest {
  id: string;
  name: string;
  version: string;
  apiVersion: "1.0";
  publisher: string;
  permissions: string[];
  capabilities: {
    surfaces: string[];
    isolationProfile: string;
  };
}

const PERMISSION = /^[a-z0-9-]+\.[a-z0-9-]+\.[a-z0-9-]+$/;

export function validateEnterpriseManifest(
  manifest: EnterpriseManifest,
  sandboxAvailable: boolean,
): { ok: true } | { ok: false; reason: string } {
  if (!PERMISSION.test(manifest.id) && !/^[a-z0-9]+(?:\.[a-z0-9]+)+$/.test(manifest.id)) {
    return { ok: false, reason: "plugin id" };
  }
  for (const permission of manifest.permissions) {
    if (!PERMISSION.test(permission)) return { ok: false, reason: `permission ${permission}` };
  }
  const wantsSandbox = manifest.capabilities.surfaces.includes("remote-backend");
  if (wantsSandbox && !sandboxAvailable) return { ok: false, reason: "sandbox unavailable" };
  return { ok: true };
}
