import { invoke } from "@/lib/platform/electron-api";

export type IdentityContextView = {
  user: { id: string; name: string };
  tenant: { id: string; name: string };
  roles: string[];
};

export function identityContext(): Promise<IdentityContextView | null> {
  return invoke<IdentityContextView | null>("identity:context");
}

export function identityRefresh(): Promise<{ ok: true; context: IdentityContextView | null } | { ok: false; error: string }> {
  return invoke("identity:refresh");
}
