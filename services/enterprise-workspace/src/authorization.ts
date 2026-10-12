import type { Membership, WorkspaceRole } from "./models.ts";

const grants: Record<WorkspaceRole, string[]> = {
  "tenant-admin": ["workspace.member.manage"],
  "workspace-admin": ["workspace.member.manage"],
  member: ["workspace.session.read"],
  viewer: ["workspace.session.read"],
};

export interface AccessToken {
  actorId: string;
  tenantId: string;
  role: WorkspaceRole;
  expiresAt: number;
}

export function authorize(input: {
  token: AccessToken | null;
  now: number;
  memberships: Membership[];
  actorId: string;
  action: string;
  resourceTenantId: string;
  approval?: { paramsHash: string; boundHash: string };
}): { decision: "allow" | "deny"; reason: string; policyVersion: "d01-1" } {
  if (!input.token || input.token.actorId !== input.actorId) {
    return { decision: "deny", reason: "forged actor", policyVersion: "d01-1" };
  }
  if (input.now >= input.token.expiresAt) {
    return { decision: "deny", reason: "expired token", policyVersion: "d01-1" };
  }
  if (input.token.tenantId !== input.resourceTenantId) {
    return { decision: "deny", reason: "tenant mismatch", policyVersion: "d01-1" };
  }
  const membership = input.memberships.find((item) => item.userId === input.actorId && item.tenantId === input.resourceTenantId);
  if (!membership) return { decision: "deny", reason: "left tenant", policyVersion: "d01-1" };
  if (input.approval && input.approval.paramsHash !== input.approval.boundHash) {
    return { decision: "deny", reason: "approval parameters changed", policyVersion: "d01-1" };
  }
  const allowed = grants[membership.role] ?? [];
  if (!allowed.includes(input.action)) {
    return { decision: "deny", reason: "role has no grant", policyVersion: "d01-1" };
  }
  return { decision: "allow", reason: "grant", policyVersion: "d01-1" };
}

export function auditLine(token: AccessToken, decision: string): string {
  return `${token.actorId} ${token.tenantId} ${decision}`;
}
