import { readFile, writeFile, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { CommandLog } from "../../services/hermes-agent-gateway/src/command-log.ts";
import { assertDeploymentConfig, readiness, rollbackRemoteFlag } from "../../services/hermes-agent-gateway/src/operations.ts";

describe("P1-08 runtime operations", () => {
  it("requires healthy dependencies and does not convert remote sessions on rollback", async () => {
    expect(readiness({ dbOk: false, upstreamOk: true })).toEqual({ ready: false, reason: "db" });
    expect(readiness({ dbOk: true, upstreamOk: false })).toEqual({ ready: false, reason: "upstream" });
    expect(readiness({ dbOk: true, upstreamOk: true }).ready).toBe(true);
    expect(() => assertDeploymentConfig({ tls: false, rateLimitPerMinute: 10, secretRef: "secret://gw" })).toThrow(/tls/);
    expect(() => assertDeploymentConfig({ tls: true, rateLimitPerMinute: 0, secretRef: "secret://gw" })).toThrow(/rate limit/);
    assertDeploymentConfig({ tls: true, rateLimitPerMinute: 60, secretRef: "secret://gw" });

    const rolled = rollbackRemoteFlag([{ sessionId: "sess-a", runtimeId: "remote-hermes:inst-a" }], false);
    expect(rolled.sessions[0]?.runtimeId).toBe("remote-hermes:inst-a");
    expect(rolled.nextRuntime).toBe("local-pi");

    const dir = await mkdtemp(join(tmpdir(), "ob-restore-"));
    const source = join(dir, "commands.json");
    const log = new CommandLog(source);
    await log.execute("key-1", "hash-a", async () => ({ runId: "run-1" }));
    const copy = join(dir, "commands-restored.json");
    await writeFile(copy, await readFile(source));
    const restored = new CommandLog(copy);
    const replay = await restored.execute("key-1", "hash-a", async () => ({ runId: "run-other" }));
    expect(replay.runId).toBe("run-1");
    expect(restored.listEvents().map((event) => event.seq)).toEqual(log.listEvents().map((event) => event.seq));
    await rm(dir, { recursive: true, force: true });

    const smoke = spawnSync(process.execPath, ["scripts/enterprise/runtime-smoke.mjs", "--profile=staging"], { encoding: "utf8" });
    expect(smoke.status).toBe(2);
  });
});
