export type WorkspaceRole = "tenant-admin" | "workspace-admin" | "member" | "viewer";

export interface Membership {
  userId: string;
  tenantId: string;
  role: WorkspaceRole;
}

export interface OrgUnit {
  id: string;
  tenantId: string;
  parentId: string | null;
}

export interface TaskRecord {
  taskId: string;
  tenantId: string;
  runId: string;
  runStateOwner: "gateway";
}

export type RetentionMode = "archive" | "physical-delete";

export class WorkspaceDirectory {
  readonly memberships: Membership[] = [];
  readonly orgs: OrgUnit[] = [];
  readonly workspaces: Array<{ id: string; tenantId: string; orgId: string }> = [];
  readonly tasks: TaskRecord[] = [];
  retention: RetentionMode | null = null;

  addMembership(membership: Membership): void {
    this.memberships.push(membership);
  }

  addOrg(org: OrgUnit): void {
    if (org.parentId) {
      const seen = new Set<string>([org.id]);
      let parentId: string | null = org.parentId;
      while (parentId) {
        if (seen.has(parentId)) throw new Error("org cycle");
        seen.add(parentId);
        const parent = this.orgs.find((item) => item.id === parentId);
        if (!parent || parent.tenantId !== org.tenantId) throw new Error("cross-tenant org parent");
        parentId = parent.parentId;
      }
    }
    this.orgs.push(org);
  }

  addWorkspace(workspace: { id: string; tenantId: string; orgId: string }): void {
    const org = this.orgs.find((item) => item.id === workspace.orgId);
    if (!org || org.tenantId !== workspace.tenantId) throw new Error("cross-tenant workspace");
    this.workspaces.push(workspace);
  }

  addTask(task: { taskId: string; tenantId: string; runId: string }): TaskRecord {
    const record: TaskRecord = { ...task, runStateOwner: "gateway" };
    this.tasks.push(record);
    return record;
  }

  migrateLocalPi(): { migrated: number; reason: string } {
    return { migrated: 0, reason: "local Pi history stays on the desktop" };
  }

  configureRetention(mode: RetentionMode): void {
    this.retention = mode;
  }
}
