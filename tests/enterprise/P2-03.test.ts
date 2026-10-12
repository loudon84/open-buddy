import { describe, expect, it } from "vitest";
import { DirectoryApi, DirectoryConflict } from "../../services/enterprise-workspace/src/directory-api.ts";

describe("P2-03 directory API", () => {
  it("blocks self-promotion and keeps the older write when revisions clash", () => {
    const api = new DirectoryApi();
    const created = api.createWorkspace({ id: "w1", tenantId: "tenant-a", name: "Alpha" });
    expect(() => api.changeRole("member", "tenant-admin")).toThrow(/cannot promote/);
    const updated = api.updateWorkspace("w1", created.revision, "Beta");
    expect(api.getWorkspace("w1")?.name).toBe("Beta");
    expect(() => api.updateWorkspace("w1", created.revision, "Gamma")).toThrow(DirectoryConflict);
    expect(api.getWorkspace("w1")).toEqual(updated);

    const failed = api.provisionAgent("key-1", { id: "agent-1", tenantId: "tenant-a", fail: true });
    expect(failed).toMatchObject({ status: "failed", reason: "upstream health check failed" });
    const retried = api.provisionAgent("key-1", { id: "agent-1", tenantId: "tenant-a", fail: false });
    expect(retried).toEqual(failed);
  });
});
