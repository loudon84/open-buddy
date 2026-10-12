import type { Scope } from "@openbuddy/runtime-adapter";

export type WorkspaceRole = "tenant-admin" | "workspace-admin" | "member" | "viewer";

export interface Membership {
  tenantId: string;
  workspaceId: string;
  actorId: string;
  role: WorkspaceRole;
}

export interface Workspace {
  workspaceId: string;
  tenantId: string;
  revision: number;
}

/** Business task fields. Run terminal state stays on the agent gateway. */
export interface TaskRecord {
  taskId: string;
  tenantId: string;
  workspaceId: string;
  runId: string | null;
  title: string;
  revision: number;
}

export type AuthzDecision = "allow" | "deny" | "ask";

export interface AuthzResult {
  decision: AuthzDecision;
  reason: string;
  policyVersion: string;
}

export function decideMembership(
  memberships: readonly Membership[],
  scope: Scope,
  action: "read" | "write" | "admin",
): AuthzResult {
  const membership = memberships.find(
    (item) =>
      item.tenantId === scope.tenantId &&
      item.workspaceId === scope.workspaceId &&
      item.actorId === scope.actorId,
  );
  if (!membership) {
    return { decision: "deny", reason: "no membership", policyVersion: "d01-dev" };
  }
  if (action === "admin" && membership.role !== "tenant-admin" && membership.role !== "workspace-admin") {
    return { decision: "deny", reason: "role cannot administer", policyVersion: "d01-dev" };
  }
  if (action === "write" && membership.role === "viewer") {
    return { decision: "deny", reason: "viewer is read only", policyVersion: "d01-dev" };
  }
  return { decision: "allow", reason: membership.role, policyVersion: "d01-dev" };
}
