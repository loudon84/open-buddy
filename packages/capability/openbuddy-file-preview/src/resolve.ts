export type PreviewProvider = "local" | "http" | "knowledge";

export interface PreviewHandle {
  provider: PreviewProvider;
  tenantId: string;
  ownerTenantId: string;
  revoked: boolean;
  expiresAt: number;
  ref: string;
}

export function resolvePreview(handle: PreviewHandle, now: number): { provider: PreviewProvider; ref: string } {
  if (handle.tenantId !== handle.ownerTenantId) throw new Error("cross-tenant");
  if (handle.revoked) throw new Error("revoked");
  if (now >= handle.expiresAt) throw new Error("expired");
  if (handle.provider !== "local" && (handle.ref.startsWith("/") || /^[A-Za-z]:\\/.test(handle.ref))) {
    throw new Error("local path");
  }
  return { provider: handle.provider, ref: handle.ref };
}
