import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import type { VerifiedIdentity } from "../../../services/hermes-agent-gateway/src/server";

interface UpstreamEvent {
  seq: number;
  type: string;
  runId: string;
  payload: unknown;
}

/**
 * Loopback stand-in for an upstream Hermes instance. The first run asks for approval `ap-1`;
 * cancelling `run-2` emits a late `run.completed` that the gateway must drop.
 */
export async function fakeHermes() {
  const events: UpstreamEvent[] = [];
  const hits: string[] = [];
  let runs = 0;
  const push = (type: string, runId: string, payload: unknown = {}) => events.push({ seq: events.length + 1, type, runId, payload });
  const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    for await (const _chunk of req) void _chunk;
    hits.push(`${req.method} ${req.url}`);
    const reply = (status: number, body: unknown) => {
      res.writeHead(status, { "content-type": "application/json" });
      res.end(JSON.stringify(body));
    };
    const url = new URL(req.url ?? "/", "http://hermes.local");
    if (req.method === "POST" && url.pathname === "/v1/sessions") return reply(201, { sessionId: "up-1" });
    if (req.method === "POST" && url.pathname === "/v1/sessions/up-1/messages") {
      runs += 1;
      const runId = `run-${runs}`;
      push("run.accepted", runId);
      push("message.delta", runId, { text: "working" });
      if (runs === 1) {
        push("approval.required", runId, {
          approvalId: "ap-1",
          actionDigest: "digest-1",
          summary: "write crm",
          expiresAt: new Date(Date.now() + 60_000).toISOString(),
        });
      }
      return reply(202, { runId });
    }
    if (req.method === "GET" && url.pathname === "/v1/sessions/up-1/events") {
      const after = Number(url.searchParams.get("afterSeq") ?? "0");
      return reply(200, { events: events.filter((event) => event.seq > after) });
    }
    if (req.method === "POST" && url.pathname === "/v1/sessions/up-1/approvals/ap-1/decision") {
      push("approval.resolved", "run-1", { approvalId: "ap-1" });
      push("run.completed", "run-1");
      return reply(200, { accepted: true });
    }
    if (req.method === "POST" && url.pathname === "/v1/sessions/up-1/runs/run-2/cancel") {
      push("run.cancelled", "run-2");
      push("run.completed", "run-2");
      return reply(200, { accepted: true });
    }
    reply(404, {});
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("no port");
  return {
    url: `http://127.0.0.1:${address.port}`,
    hits,
    close: () => new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve()))),
  };
}

export const gatewayTokens: Record<string, VerifiedIdentity> = {
  admin: { tenantId: "t1", workspaceId: "w1", actorId: "admin", role: "tenant-admin" },
  member: { tenantId: "t1", workspaceId: "w1", actorId: "alice", role: "member" },
  viewer: { tenantId: "t1", workspaceId: "w1", actorId: "bob", role: "viewer" },
};

export async function registerInstance(gateway: { fetch(path: string, init?: RequestInit): Promise<Response> }, upstreamUrl: string) {
  return gateway.fetch("/v1/agent-instances", {
    method: "POST",
    headers: { authorization: "Bearer admin", "content-type": "application/json" },
    body: JSON.stringify({
      agentInstanceId: "inst-1",
      upstreamUrl,
      capabilities: { resume: true, cancel: true, approvals: true, tools: false, tasks: false, artifacts: false },
    }),
  });
}
