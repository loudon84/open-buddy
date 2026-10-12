import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { WorkspaceDirectory } from "../../services/enterprise-workspace/src/models.ts";
import { IsolationDirectory, isolationPaths, type IsolationPath } from "../../services/enterprise-workspace/src/isolation.ts";

const callerA = { tenantId: "tenant-a", workspaceId: "ws-a", userId: "user-a" };
const callerB = { tenantId: "tenant-b", workspaceId: "ws-b", userId: "user-b" };

function seed(): IsolationDirectory {
  const directory = new IsolationDirectory();
  for (const path of isolationPaths) {
    directory.put({ id: `${path}-a`, tenantId: "tenant-a", workspaceId: "ws-a", path, title: `${path} alpha` });
    directory.put({ id: `${path}-b`, tenantId: "tenant-b", workspaceId: "ws-b", path, title: `${path} beta` });
  }
  return directory;
}

describe("P2-07 workspace isolation", () => {
  it("keeps nine paths inside the caller scope and reconciles a restore", () => {
    const directory = seed();
    for (const path of isolationPaths) {
      const own = directory.visible(callerA, path as IsolationPath);
      expect(own.map((row) => row.id)).toEqual([`${path}-a`]);
      expect(directory.visible(callerB, path as IsolationPath).map((row) => row.id)).toEqual([`${path}-b`]);
      expect(directory.visible(callerA, path, "beta")).toEqual([]);
    }
    directory.revoke("download-a");
    expect(directory.visible(callerA, "download")).toEqual([]);

    const restored = IsolationDirectory.restore(directory.snapshot(), ["download-a", "missing-run"]);
    expect(restored.missing).toEqual(["missing-run"]);
    expect(directory.snapshot().find((row) => row.id === "download-a")?.revoked).toBe(true);

    expect(new WorkspaceDirectory().migrateLocalPi().migrated).toBe(0);

    const smoke = spawnSync(process.execPath, ["scripts/enterprise/workspace-smoke.mjs", "--profile=staging"], { encoding: "utf8" });
    expect(smoke.status).toBe(2);
  });
});
