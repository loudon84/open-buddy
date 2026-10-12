import { createServer, type IncomingHttpHeaders, type Server } from "node:http";
import { CommandConflict, CommandLog } from "./command-log.ts";
import { callUpstream } from "./upstream-adapter.ts";
import { RouteStore, type InstanceCapabilities } from "./session-store.ts";

export interface VerifiedIdentity {
  tenantId: string;
  workspaceId: string;
  actorId: string;
  role: "tenant-admin" | "member" | "viewer";
}

export interface Gateway {
  url: string;
  fetch(path: string, init?: RequestInit): Promise<Response>;
  close(): Promise<void>;
}

function notFound() {
  return {
    status: 404,
    body: { error: { code: "NOT_FOUND", message: "Not found", retryable: false, traceId: "trace-cross-tenant" } },
  };
}

async function readJson(req: import("node:http").IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(Buffer.from(chunk));
  if (chunks.length === 0) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf8")) as Record<string, unknown>;
}

export async function startGateway(options: {
  dbPath: string;
  verify: (headers: IncomingHttpHeaders) => VerifiedIdentity | null;
}): Promise<Gateway> {
  const store = new RouteStore(options.dbPath);
  const commands = new CommandLog(`${options.dbPath}.commands.json`);
  const server: Server = createServer(async (req, res) => {
    const send = (status: number, body: unknown) => {
      res.writeHead(status, { "content-type": "application/json" });
      res.end(JSON.stringify(body));
    };
    try {
      const identity = options.verify(req.headers);
      if (!identity) {
        send(401, { error: { code: "UNAUTHENTICATED", message: "Unverified", retryable: false, traceId: "trace-auth" } });
        return;
      }
      const url = new URL(req.url ?? "/", "http://gateway.local");
      const body = req.method === "GET" ? {} : await readJson(req);

      if (req.method === "POST" && url.pathname === "/v1/agent-instances") {
        if (identity.role !== "tenant-admin") {
          send(403, { error: { code: "FORBIDDEN", message: "Forbidden", retryable: false, traceId: "trace-role" } });
          return;
        }
        if (typeof body.tenantId === "string" && body.tenantId !== identity.tenantId) {
          send(notFound().status, notFound().body);
          return;
        }
        store.saveInstance({
          tenantId: identity.tenantId,
          workspaceId: identity.workspaceId,
          agentInstanceId: String(body.agentInstanceId),
          upstreamUrl: String(body.upstreamUrl),
          capabilities: body.capabilities as InstanceCapabilities,
        });
        send(201, { agentInstanceId: body.agentInstanceId });
        return;
      }

      if (req.method === "POST" && url.pathname === "/v1/sessions") {
        const instance = store.findInstance(identity.tenantId, String(body.agentInstanceId));
        if (!instance) {
          send(notFound().status, notFound().body);
          return;
        }
        const upstream = await callUpstream(instance.upstreamUrl, "/v1/sessions", {
          method: "POST",
          body: { agentInstanceId: instance.agentInstanceId },
        });
        const sessionId = String(upstream.body.sessionId);
        store.saveSession({
          sessionId,
          tenantId: identity.tenantId,
          workspaceId: identity.workspaceId,
          actorId: identity.actorId,
          agentInstanceId: instance.agentInstanceId,
          upstreamUrl: instance.upstreamUrl,
          status: "idle",
        });
        send(201, {
          sessionId,
          tenantId: identity.tenantId,
          workspaceId: identity.workspaceId,
          actorId: identity.actorId,
          agentInstanceId: instance.agentInstanceId,
          runtimeId: `remote-hermes:${instance.agentInstanceId}`,
          status: "idle",
        });
        return;
      }

      const sessionMatch = url.pathname.match(/^\/v1\/sessions\/([^/]+)$/);
      if (req.method === "GET" && sessionMatch) {
        const session = store.findSession(sessionMatch[1] ?? "");
        if (!session || session.tenantId !== identity.tenantId) {
          send(notFound().status, notFound().body);
          return;
        }
        send(200, session);
        return;
      }

      const messageMatch = url.pathname.match(/^\/v1\/sessions\/([^/]+)\/messages$/);
      if (req.method === "POST" && messageMatch) {
        const session = store.findSession(messageMatch[1] ?? "");
        if (!session || session.tenantId !== identity.tenantId) {
          send(notFound().status, notFound().body);
          return;
        }
        try {
          const receipt = await commands.execute(String(req.headers["idempotency-key"] ?? ""), JSON.stringify(body), async () => {
            const upstream = await callUpstream(session.upstreamUrl, `/v1/sessions/${session.sessionId}/messages`, {
              method: "POST",
              body: { text: body.text },
            });
            return { sessionId: session.sessionId, runId: String(upstream.body.runId), traceId: "trace-send" };
          });
          send(202, receipt);
        } catch (error) {
          if (error instanceof CommandConflict) {
            send(409, { error: { code: "CONFLICT", message: error.message, retryable: false, traceId: "trace-key" } });
            return;
          }
          throw error;
        }
        return;
      }

      const statusMatch = url.pathname.match(/^\/v1\/agent-instances\/([^/]+)\/status$/);
      if (req.method === "GET" && statusMatch) {
        const instance = store.findInstance(identity.tenantId, statusMatch[1] ?? "");
        if (!instance) {
          send(notFound().status, notFound().body);
          return;
        }
        const upstream = await callUpstream(instance.upstreamUrl, `/v1/agent-instances/${instance.agentInstanceId}/status`, { method: "GET" });
        send(200, {
          agentInstanceId: instance.agentInstanceId,
          status: upstream.body.status,
          capabilities: { protocolVersion: "1.0", ...instance.capabilities },
          updatedAt: new Date(0).toISOString(),
        });
        return;
      }

      if (req.method === "POST" && url.pathname === "/v1/tasks") {
        const instance = store.findInstance(identity.tenantId, String(body.agentInstanceId));
        if (!instance) {
          send(notFound().status, notFound().body);
          return;
        }
        if (!instance.capabilities.tasks) {
          send(400, { error: { code: "UNSUPPORTED_CAPABILITY", message: "tasks are false", retryable: false, traceId: "trace-cap" } });
          return;
        }
        send(202, { taskId: "task-1", status: "queued" });
        return;
      }

      send(404, notFound().body);
    } catch (error) {
      send(502, { error: { code: "UPSTREAM_UNAVAILABLE", message: error instanceof Error ? error.message : "upstream", retryable: true, traceId: "trace-up" } });
    }
  });

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("gateway did not bind");
  const url = `http://127.0.0.1:${address.port}`;
  return {
    url,
    fetch: (path, init) => fetch(new URL(path, url), init),
    close: () => new Promise((resolve, reject) => {
      server.close((error) => {
        store.close();
        if (error) reject(error);
        else resolve();
      });
    }),
  };
}
