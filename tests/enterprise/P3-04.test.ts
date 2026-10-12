import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { installBackend, launch, type ContainerRuntime } from "../../services/enterprise-plugin-worker/src/broker";

const runtime: ContainerRuntime = { kind: "container", run: () => ({ ok: true }) };
const profile = { user: "plugin", readonlyRootfs: true, network: false, hostFs: false, secrets: [], timeoutMs: 1000, cpuMillis: 100, memoryMb: 128 };

describe("P3-04 container gate", () => {
  it("refuses in-process execution and an escaping path", () => {
    expect(() => installBackend({ capabilities: ["renderer"], runtime })).toThrow(/capability missing/);
    expect(() => installBackend({ capabilities: ["remote-backend"], runtime: null })).toThrow(/in-process/);
    expect(launch(profile, { path: "/work/in" }, installBackend({ capabilities: ["remote-backend"], runtime }))).toEqual({ ok: true });
    expect(() => launch({ ...profile, user: "root" }, { path: "/work/in" }, runtime)).toThrow(/profile/);
    expect(() => launch(profile, { path: "/host/etc/passwd" }, runtime)).toThrow(/escape/);
    const source = readFileSync(resolve("services/enterprise-plugin-worker/src/runner.ts"), "utf8");
    expect(source).not.toContain("worker_threads");
    expect(source).not.toContain("node:vm");
  });
});
