import { describe, expect, it } from "vitest";
import { WorkspaceDirectory } from "../../services/enterprise-workspace/src/models";

describe("P2-01 workspace model", () => {
  it("allows multi-tenant membership and refuses a cycle, a cross-tenant link, and Pi migration", () => {
    const directory = new WorkspaceDirectory();
    directory.addMembership({ userId: "user-1", tenantId: "tenant-a", role: "member" });
    directory.addMembership({ userId: "user-1", tenantId: "tenant-b", role: "viewer" });
    expect(directory.memberships.filter((item) => item.userId === "user-1")).toHaveLength(2);

    directory.addOrg({ id: "root", tenantId: "tenant-a", parentId: null });
    directory.addOrg({ id: "child", tenantId: "tenant-a", parentId: "root" });
    expect(() => directory.addOrg({ id: "root", tenantId: "tenant-a", parentId: "child" })).toThrow(/cycle/);
    expect(() => directory.addWorkspace({ id: "w", tenantId: "tenant-b", orgId: "root" })).toThrow(/cross-tenant/);

    const task = directory.addTask({ taskId: "task-1", tenantId: "tenant-a", runId: "run-1" });
    expect(task.runStateOwner).toBe("gateway");
    expect(directory.migrateLocalPi()).toEqual({ migrated: 0, reason: "local Pi history stays on the desktop" });
    expect(() => directory.configureRetention("archive")).not.toThrow();
    directory.configureRetention("physical-delete");
    expect(directory.retention).toBe("physical-delete");
  });
});
