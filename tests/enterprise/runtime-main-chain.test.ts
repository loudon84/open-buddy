import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { RemoteHermesAdapter, RemoteRuntimeError } from "../../electron/main/runtime/remote-hermes-adapter";
import type { RuntimeEvent, SessionRef } from "../../packages/runtime/openbuddy-runtime-adapter/src/types";
import { startGateway } from "../../services/hermes-agent-gateway/src/server";
import { fakeHermes, gatewayTokens as tokens, registerInstance } from "./helpers/fake-hermes";

function adapterFor(url: string, token: string) {
  return new RemoteHermesAdapter({
    endpoint: url,
    tokens: { getAccessToken: async () => token, refresh: async () => token },
    log: () => {},
    pollIntervalMs: 5,
  });
}

async function collect(
  adapter: RemoteHermesAdapter,
  ref: SessionRef,
  afterSeq: number,
  until: (event: RuntimeEvent) => boolean,
  timeoutMs = 5000,
) {
  const seen: RuntimeEvent[] = [];
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  for await (const event of adapter.stream(ref, afterSeq, { signal: controller.signal })) {
    seen.push(event);
    if (until(event)) break;
  }
  clearTimeout(timer);
  return seen;
}

describe("runtime main chain: desktop adapter to gateway to upstream", () => {
  it("creates, sends, streams, approves, resumes, cancels, and rejects viewers", async () => {
    const dir = await mkdtemp(join(tmpdir(), "ob-chain-"));
    const hermes = await fakeHermes();
    const gateway = await startGateway({
      dbPath: join(dir, "routes.sqlite"),
      verify: (headers) => tokens[String(headers.authorization ?? "").replace(/^Bearer /, "")] ?? null,
    });
    expect((await registerInstance(gateway, hermes.url)).status).toBe(201);

    const adapter = adapterFor(gateway.url, "member");
    expect((await adapter.connect()).protocolVersion).toBe("1.0");
    const ctx = (key: string) => ({ tenantId: "t1", workspaceId: "w1", actorId: "alice", requestId: key, idempotencyKey: key });
    const session = await adapter.createSession({ ...ctx("create-1"), agentInstanceId: "inst-1" });
    expect(session.sessionId).toMatch(/^gws_/);
    expect(session.runtimeId).toBe("remote-hermes:inst-1");

    const receipt = await adapter.sendMessage({ ...ctx("send-1"), sessionId: session.sessionId, text: "update crm", artifactIds: [] });
    expect(receipt).toMatchObject({ runId: "run-1", status: "accepted" });
    const replay = await adapter.sendMessage({ ...ctx("send-1"), sessionId: session.sessionId, text: "update crm", artifactIds: [] });
    expect(replay.runId).toBe("run-1");
    expect(hermes.hits.filter((hit) => hit.endsWith("/messages"))).toHaveLength(1);

    const first = await collect(adapter, session, 0, (event) => event.type === "approval.required");
    expect(first.map((event) => event.type)).toEqual(["run.accepted", "message.delta", "approval.required"]);
    expect(first.map((event) => event.seq)).toEqual([1, 2, 3]);
    expect(first[2]).toMatchObject({ sessionId: session.sessionId, tenantId: "t1", payload: { approvalId: "ap-1" } });

    await expect(
      adapter.resolveApproval(session, "ap-1", "approve", { ...ctx("decide-bad"), actionDigest: "tampered" }),
    ).rejects.toMatchObject({ code: "CONFLICT" });
    expect(await adapter.resolveApproval(session, "ap-1", "approve", { ...ctx("decide-1"), actionDigest: "digest-1" })).toMatchObject({
      accepted: true,
    });

    const resumed = await collect(adapter, session, 3, (event) => event.type === "run.completed");
    expect(resumed.map((event) => [event.seq, event.type])).toEqual([
      [4, "approval.resolved"],
      [5, "run.completed"],
    ]);

    const second = await adapter.sendMessage({ ...ctx("send-2"), sessionId: session.sessionId, text: "again", artifactIds: [] });
    expect(second.runId).toBe("run-2");
    expect(await adapter.cancel(session, "run-2", ctx("cancel-1"))).toMatchObject({ accepted: true });
    const cancelled = await collect(adapter, session, 5, (event) => event.type === "run.cancelled");
    expect(cancelled.map((event) => event.type)).toEqual(["run.accepted", "message.delta", "run.cancelled"]);
    const tail = await collect(adapter, session, 8, () => true, 200);
    expect(tail.filter((event) => event.runId === "run-2" && event.type === "run.completed")).toEqual([]);

    const viewer = adapterFor(gateway.url, "viewer");
    const denied = await viewer
      .sendMessage({ ...ctx("send-v"), sessionId: session.sessionId, text: "hi", artifactIds: [] })
      .catch((error: unknown) => error);
    expect(denied).toBeInstanceOf(RemoteRuntimeError);
    expect(denied).toMatchObject({ code: "FORBIDDEN", status: 403 });

    await gateway.close();
    await hermes.close();
    await rm(dir, { recursive: true, force: true });
  }, 30_000);
});
