import { describe, expect, it } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { createServer, type Server } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { startGateway, type VerifiedIdentity } from "../../services/hermes-agent-gateway/src/server";

function identity(tenantId: string, role: VerifiedIdentity["role"] = "tenant-admin"): VerifiedIdentity {
  return { tenantId, workspaceId: "workspace-1", actorId: "actor-1", role };
}

async function listen(handler: (req: import("node:http").IncomingMessage, res: import("node:http").ServerResponse) => void): Promise<{ url: string; hits: string[]; close: () => Promise<void> }> {
  const hits: string[] = [];
  const server: Server = createServer((req, res) => {
    hits.push(`${req.method} ${req.url}`);
    handler(req, res);
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("no port");
  return {
    url: `http://127.0.0.1:${address.port}`,
    hits,
    close: () => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())),
  };
}

describe("P1-02 gateway routing", () => {
  it("routes two instances in one tenant and hides the other tenant", async () => {
    const dir = await mkdtemp(join(tmpdir(), "ob-gw-"));
    const upstreamA = await listen((_req, res) => {
      res.writeHead(201, { "content-type": "application/json" });
      res.end(JSON.stringify({ sessionId: "sess-a", runId: "run-a", status: "idle" }));
    });
    const upstreamB = await listen((_req, res) => {
      res.writeHead(201, { "content-type": "application/json" });
      res.end(JSON.stringify({ sessionId: "sess-b", runId: "run-b", status: "idle" }));
    });
    const evil = await listen((_req, res) => {
      res.writeHead(200);
      res.end("{}");
    });
    const gateway = await startGateway({
      dbPath: join(dir, "routes.sqlite"),
      verify: (headers) => identity(String(headers["x-tenant-id"]), headers["x-role"] === "member" ? "member" : "tenant-admin"),
    });

    const register = (instanceId: string, upstreamUrl: string, tasks: boolean) =>
      gateway.fetch("/v1/agent-instances", {
        method: "POST",
        headers: { "content-type": "application/json", "x-tenant-id": "tenant-a", "x-role": "tenant-admin" },
        body: JSON.stringify({
          agentInstanceId: instanceId,
          upstreamUrl,
          capabilities: { resume: true, cancel: true, approvals: true, tools: true, tasks, artifacts: false },
        }),
      });

    expect((await register("inst-a", upstreamA.url, false)).status).toBe(201);
    expect((await register("inst-b", upstreamB.url, false)).status).toBe(201);

    const crossed = await gateway.fetch("/v1/agent-instances", {
      method: "POST",
      headers: { "content-type": "application/json", "x-tenant-id": "tenant-b", "x-role": "tenant-admin" },
      body: JSON.stringify({
        tenantId: "tenant-a",
        agentInstanceId: "inst-a",
        upstreamUrl: evil.url,
        capabilities: { resume: false, cancel: false, approvals: false, tools: false, tasks: false, artifacts: false },
      }),
    });
    expect(crossed.status).toBe(404);

    const created = await gateway.fetch("/v1/sessions", {
      method: "POST",
      headers: { "content-type": "application/json", "idempotency-key": "k1", "x-tenant-id": "tenant-a", "x-role": "member" },
      body: JSON.stringify({ agentInstanceId: "inst-a", upstreamUrl: evil.url }),
    });
    expect(created.status).toBe(201);
    const session = await created.json() as { sessionId: string; runtimeId: string };
    expect(session.sessionId).toMatch(/^gws_/);
    expect(JSON.stringify(session)).not.toContain(upstreamA.url);
    expect(upstreamA.hits).toEqual(["POST /v1/sessions"]);
    expect(evil.hits).toEqual([]);

    const sent = await gateway.fetch(`/v1/sessions/${session.sessionId}/messages`, {
      method: "POST",
      headers: { "content-type": "application/json", "idempotency-key": "k2", "x-tenant-id": "tenant-a", "x-role": "member" },
      body: JSON.stringify({ text: "hello" }),
    });
    expect(sent.status).toBe(202);
    const receipt = await sent.json() as { runId: string; status: string };
    expect(receipt).toMatchObject({ runId: "run-a", status: "accepted" });
    expect(upstreamA.hits.at(-1)).toBe("POST /v1/sessions/sess-a/messages");

    const status = await gateway.fetch("/v1/agent-instances/inst-a/status", {
      headers: { "x-tenant-id": "tenant-a", "x-role": "member" },
    });
    expect(status.status).toBe(200);
    const body = await status.json() as { capabilities: { tasks: boolean } };
    expect(body.capabilities.tasks).toBe(false);

    const task = await gateway.fetch("/v1/tasks", {
      method: "POST",
      headers: { "content-type": "application/json", "idempotency-key": "k3", "x-tenant-id": "tenant-a", "x-role": "member" },
      body: JSON.stringify({ agentInstanceId: "inst-a", title: "nope" }),
    });
    expect(task.status).toBe(400);
    expect(await task.json()).toMatchObject({ error: { code: "UNSUPPORTED_CAPABILITY" } });

    const hidden = await gateway.fetch(`/v1/sessions/${session.sessionId}`, {
      headers: { "x-tenant-id": "tenant-b", "x-role": "member" },
    });
    expect(hidden.status).toBe(404);
    expect(await hidden.json()).toMatchObject({ error: { code: "NOT_FOUND" } });

    const other = await gateway.fetch("/v1/sessions", {
      method: "POST",
      headers: { "content-type": "application/json", "idempotency-key": "k4", "x-tenant-id": "tenant-a", "x-role": "member" },
      body: JSON.stringify({ agentInstanceId: "inst-b" }),
    });
    expect((await other.json() as { sessionId: string }).sessionId).toMatch(/^gws_/);
    expect(upstreamB.hits).toEqual(["POST /v1/sessions"]);

    await gateway.close();
    const restarted = await startGateway({
      dbPath: join(dir, "routes.sqlite"),
      verify: () => identity("tenant-a", "member"),
    });
    const again = await restarted.fetch(`/v1/sessions/${session.sessionId}`);
    expect(again.status).toBe(200);
    await restarted.close();
    await upstreamA.close();
    await upstreamB.close();
    await evil.close();
    await rm(dir, { recursive: true, force: true });
  });
});
