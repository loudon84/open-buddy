/** Frozen contract header for the active Casdoor tenant (v1.1). */
export const TENANT_HEADER = "X-Tenant-Id";

export function tenantHeaders(tenantId: string | undefined): Record<string, string> {
  const normalized = tenantId?.trim();
  return normalized ? { [TENANT_HEADER]: normalized } : {};
}
