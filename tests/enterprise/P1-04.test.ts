import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { CommandConflict, CommandInvalid, CommandLog } from "../../services/hermes-agent-gateway/src/command-log";

describe("P1-04 command log", () => {
  it("replays the same receipt, keeps one terminal state, and reconciles unknown writes", async () => {
    const dir = await mkdtemp(join(tmpdir(), "ob-cmd-"));
    const path = join(dir, "commands.json");
    const log = new CommandLog(path);
    const scope = { tenantId: "tenant-a", workspaceId: "ws-a", operation: "session.message", resourceId: "sess-a" };
    let created = 0;
    const first = await log.execute(scope, "key-1", "hash-a", async () => {
      created += 1;
      return { runId: "run-1" };
    });
    const replay = await log.execute(scope, "key-1", "hash-a", async () => {
      created += 1;
      return { runId: "run-other" };
    });
    expect(replay).toEqual(first);
    expect(created).toBe(1);
    await expect(log.execute(scope, "key-1", "hash-b", async () => ({ runId: "run-2" }))).rejects.toBeInstanceOf(CommandConflict);

    const otherSession = await log.execute({ ...scope, resourceId: "sess-b" }, "key-1", "hash-a", async () => {
      created += 1;
      return { runId: "run-b" };
    });
    expect(otherSession.runId).toBe("run-b");
    const otherTenant = await log.execute({ ...scope, tenantId: "tenant-b" }, "key-1", "hash-a", async () => {
      created += 1;
      return { runId: "run-t" };
    });
    expect(otherTenant.runId).toBe("run-t");
    expect(created).toBe(3);
    await expect(log.execute(scope, "", "hash-a", async () => ({ runId: "x" }))).rejects.toBeInstanceOf(CommandInvalid);

    const reloaded = new CommandLog(path);
    await reloaded.execute(scope, "key-1", "hash-a", async () => {
      created += 1;
      return { runId: "run-new" };
    });
    expect(created).toBe(3);

    const [left, right] = await Promise.all([
      reloaded.finish("run-1", "cancelled"),
      reloaded.finish("run-1", "completed"),
    ]);
    expect(left).toBe(right);
    const terminals = reloaded.listEvents().filter((event) => event.type === "run.cancelled" || event.type === "run.completed");
    expect(terminals).toHaveLength(1);

    reloaded.openApproval({ id: "apr-1", expiresAt: 100, paramsHash: "params-a" });
    expect(() => reloaded.decide({ id: "apr-1", now: 100, paramsHash: "params-a", decision: "approve" })).toThrow(/expired/);
    expect(() => reloaded.decide({ id: "apr-1", now: 50, paramsHash: "params-b", decision: "approve" })).toThrow(/changed/);
    reloaded.decide({ id: "apr-1", now: 50, paramsHash: "params-a", decision: "approve" });
    expect(() => reloaded.decide({ id: "apr-1", now: 50, paramsHash: "params-a", decision: "reject" })).toThrow(/already decided/);

    reloaded.recordUnknown("ext-1", { result: "unknown" });
    expect(reloaded.reconciliation()).toEqual([{ id: "ext-1", detail: { result: "unknown" } }]);
    await rm(dir, { recursive: true, force: true });
  });
});
