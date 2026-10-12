import { describe, expect, it } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { startGateway, type VerifiedIdentity } from "../../services/hermes-agent-gateway/src/server";

const capabilities = { resume: true, cancel: true, approvals: true, tools: true, tasks: true, artifacts: true };

describe("gateway workspace authorization and idempotency scope", () => {
  it("keeps instances, sessions, and receipts inside the caller workspace", async () => {
    const dir = await mkdtemp(join(tmpdir(), "ob-gw-auth-"));
    const messages: string[] = [];
    const tasks: string[] = [];
    let run = 0;
    const upstream = createServer(async (req, res) => {
      const chunks: Buffer[] = [];
      for await (const chunk of req) chunks.push(Buffer.from(chunk));
      const body = chunks.length ? JSON.parse(Buffer.concat(chunks).toString()) : {};
      res.setHeader("content-type", "application/json");
      if (req.url === "/v1/sessions") {
        res.writeHead(201);
        res.end(JSON.stringify({ sessionId: `session-${body.agentInstanceId}` }));
        return;
      }
      if (req.url === "/v1/tasks") {
        tasks.push(String(body.title));
        res.writeHead(202);
        res.end(JSON.stringify({ taskId: `upstream-task-${tasks.length}` }));
        return;
      }
      if (req.url?.endsWith("/messages")) {
        run += 1;
        messages.push(req.url);
        res.writeHead(202);
        res.end(JSON.stringify({ runId: `run-${run}` }));
        return;
      }
      res.writeHead(200);
      res.end("{}");
    });
    await new Promise<void>((resolve) => upstream.listen(0, "127.0.0.1", resolve));
    const address = upstream.address();
    if (!address || typeof address === "string") throw new Error("no port");
    const upstreamUrl = `http://127.0.0.1:${address.port}`;

    const gateway = await startGateway({
      dbPath: join(dir, "routes.json"),
      verify: (headers) =>
        headers["x-tenant"]
          ? ({
              tenantId: String(headers["x-tenant"]),
              workspaceId: String(headers["x-workspace"]),
              actorId: String(headers["x-actor"]),
              role: String(headers["x-role"]) as VerifiedIdentity["role"],
            })
          : null,
    });
    const as = (workspace: string, role: VerifiedIdentity["role"], key?: string) => ({
      "content-type": "application/json",
      "x-tenant": "tenant-1",
      "x-workspace": workspace,
      "x-actor": `${role}-${workspace}`,
      "x-role": role,
      ...(key ? { "idempotency-key": key } : {}),
    });
    const register = (workspace: string, id: string) =>
      gateway.fetch("/v1/agent-instances", {
        method: "POST",
        headers: as(workspace, "tenant-admin"),
        body: JSON.stringify({ agentInstanceId: id, upstreamUrl, capabilities }),
      });
    expect((await register("ws-b", "instance-b")).status).toBe(201);
    expect((await register("ws-a", "instance-a")).status).toBe(201);

    const crossCreate = await gateway.fetch("/v1/sessions", {
      method: "POST",
      headers: as("ws-a", "member"),
      body: JSON.stringify({ agentInstanceId: "instance-b" }),
    });
    expect(crossCreate.status).toBe(404);

    const viewerCreate = await gateway.fetch("/v1/sessions", {
      method: "POST",
      headers: as("ws-a", "viewer"),
      body: JSON.stringify({ agentInstanceId: "instance-a" }),
    });
    expect(viewerCreate.status).toBe(403);

    const sessionA = (await (await gateway.fetch("/v1/sessions", {
      method: "POST",
      headers: as("ws-a", "member"),
      body: JSON.stringify({ agentInstanceId: "instance-a" }),
    })).json()) as { sessionId: string };
    const sessionB = (await (await gateway.fetch("/v1/sessions", {
      method: "POST",
      headers: as("ws-b", "member"),
      body: JSON.stringify({ agentInstanceId: "instance-b" }),
    })).json()) as { sessionId: string };

    const crossRead = await gateway.fetch(`/v1/sessions/${sessionB.sessionId}`, { headers: as("ws-a", "member") });
    expect(crossRead.status).toBe(404);
    const crossSend = await gateway.fetch(`/v1/sessions/${sessionB.sessionId}/messages`, {
      method: "POST",
      headers: as("ws-a", "tenant-admin", "x"),
      body: JSON.stringify({ text: "cross" }),
    });
    expect(crossSend.status).toBe(404);
    const viewerSend = await gateway.fetch(`/v1/sessions/${sessionA.sessionId}/messages`, {
      method: "POST",
      headers: as("ws-a", "viewer", "v1"),
      body: JSON.stringify({ text: "viewer" }),
    });
    expect(viewerSend.status).toBe(403);
    const noKey = await gateway.fetch(`/v1/sessions/${sessionA.sessionId}/messages`, {
      method: "POST",
      headers: as("ws-a", "member"),
      body: JSON.stringify({ text: "no key" }),
    });
    expect(noKey.status).toBe(400);
    expect(messages).toEqual([]);

    const first = (await (await gateway.fetch(`/v1/sessions/${sessionA.sessionId}/messages`, {
      method: "POST",
      headers: as("ws-a", "member", "same-key"),
      body: JSON.stringify({ text: "same payload" }),
    })).json()) as { runId: string };
    const second = (await (await gateway.fetch(`/v1/sessions/${sessionB.sessionId}/messages`, {
      method: "POST",
      headers: as("ws-b", "member", "same-key"),
      body: JSON.stringify({ text: "same payload" }),
    })).json()) as { runId: string };
    expect(first.runId).not.toBe(second.runId);
    expect(messages).toHaveLength(2);

    const task = await gateway.fetch("/v1/tasks", {
      method: "POST",
      headers: as("ws-a", "member", "task-1"),
      body: JSON.stringify({ agentInstanceId: "instance-a", title: "report" }),
    });
    expect(task.status).toBe(202);
    expect(await task.json()).toMatchObject({ taskId: "upstream-task-1", status: "accepted" });
    expect(tasks).toEqual(["report"]);

    await gateway.close();
    await new Promise<void>((resolve, reject) => upstream.close((error) => (error ? reject(error) : resolve())));
    await rm(dir, { recursive: true, force: true });
  });
});
