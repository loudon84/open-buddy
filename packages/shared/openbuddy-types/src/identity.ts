/** Enterprise identity context consumed by Desktop and Agent Runtime. */

export interface IdentityContext {
  user: { id: string; name: string };
  tenant: { id: string; name: string };
  roles: string[];
  permissions: string[];
  policies?: { agents?: string[] };
}

export interface IdentityCacheEnvelope {
  contextVersion: "v1";
  expiresAt: string;
  lastRefreshedAt: string;
  identityContext: IdentityContext;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function named(value: unknown): { id: string; name: string } | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  if (typeof record.id !== "string" || !record.id) return null;
  if (typeof record.name !== "string") return null;
  return { id: record.id, name: record.name };
}

/** Parse a backend identity context payload. Returns null when required fields are missing. */
export function parseIdentityContext(value: unknown): IdentityContext | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const user = named(record.user);
  const tenant = named(record.tenant);
  if (!user || !tenant) return null;
  if (!isStringArray(record.roles) || !isStringArray(record.permissions)) return null;
  const context: IdentityContext = { user, tenant, roles: record.roles, permissions: record.permissions };
  if (record.policies !== undefined) {
    if (!record.policies || typeof record.policies !== "object") return null;
    const policies = record.policies as Record<string, unknown>;
    if (policies.agents !== undefined && !isStringArray(policies.agents)) return null;
    context.policies = policies.agents === undefined ? {} : { agents: policies.agents };
  }
  return context;
}
