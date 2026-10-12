import { randomUUID } from "node:crypto";
import { createServer, type IncomingHttpHeaders, type IncomingMessage, type Server } from "node:http";
import { CommandConflict, CommandInvalid, CommandLog, type CommandScope, type Terminal } from "./command-log";
import { SessionEventStore, type UpstreamEvent } from "./event-log";
import { callUpstream } from "./upstream-adapter";
import { RouteStore, type InstanceCapabilities, type InstanceRow, type SessionRow } from "./session-store";

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

const terminals: Record<string, Terminal> = {
  "run.completed": "completed",
  "run.cancelled": "cancelled",
  "run.failed": "failed",
};

function canWrite(identity: VerifiedIdentity): boolean {
  return identity.role === "tenant-admin" || identity.role === "member";
}

function errorBody(code: string, message: string, retryable = false) {
  return { error: { code, message, retryable, traceId: `trace-${randomUUID()}` } };
}

async function readJson(req: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(Buffer.from(chunk));
  if (chunks.length === 0) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf8")) as Record<string, unknown>;
}

function publicSession(session: SessionRow, lastSeq: number) {
  return {
    sessionId: session.sessionId,
    tenantId: session.tenantId,
    workspaceId: session.workspaceId,
    actorId: session.actorId,
    agentInstanceId: session.agentInstanceId,
    runtimeId: `remote-hermes:${session.agentInstanceId}`,
    status: session.status,
    lastSeq,
  };
}

class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export async function startGateway(options: {
  dbPath: string;
  verify: (headers: IncomingHttpHeaders) => VerifiedIdentity | null;
}): Promise<Gateway> {
  const store = new RouteStore(options.dbPath);
  const commands = new CommandLog(`${options.dbPath}.commands.json`);
  const events = new SessionEventStore(`${options.dbPath}.events.json`);

  const pullUpstreamEvents = async (session: SessionRow) => {
    const cursor = events.upstreamCursor(session.sessionId);
    const upstream = await callUpstream(session.upstreamUrl, `/v1/sessions/${session.upstreamSessionId}/events?afterSeq=${cursor}`, {
      method: "GET",
    });
    if (upstream.status >= 500) throw new Error(`upstream status ${upstream.status}`);
    const page = Array.isArray(upstream.body.events) ? (upstream.body.events as UpstreamEvent[]) : [];
    const finished: Array<{ runId: string; terminal: Terminal }> = [];
    events.ingest(session.sessionId, page, (event) => {
      const payload = (event.payload ?? {}) as Record<string, unknown>;
      if (event.type === "approval.required" && typeof payload.approvalId === "string") {
        commands.openApproval({
          id: `${session.sessionId}:${payload.approvalId}`,
          expiresAt: Date.parse(String(payload.expiresAt)),
          paramsHash: String(payload.actionDigest),
        });
      }
      const terminal = terminals[event.type];
      if (terminal && event.runId) {
        if (commands.terminalOf(event.runId) || finished.some((item) => item.runId === event.runId)) return false;
        finished.push({ runId: event.runId, terminal });
      }
      return true;
    });
    for (const item of finished) await commands.finish(item.runId, item.terminal);
  };

  const server: Server = createServer(async (req, res) => {
    const send = (status: number, body: unknown) => {
      res.writeHead(status, { "content-type": "application/json" });
      res.end(JSON.stringify(body));
    };
    const runCommand = async <T extends { runId: string }>(
      scope: CommandScope,
      body: Record<string, unknown>,
      create: () => Promise<T>,
    ): Promise<void> => {
      try {
        const receipt = await commands.execute(scope, String(req.headers["idempotency-key"] ?? ""), JSON.stringify(body), create);
        send(202, receipt);
      } catch (error) {
        if (error instanceof CommandInvalid) {
          send(400, errorBody("INVALID_ARGUMENT", error.message));
          return;
        }
        if (error instanceof CommandConflict) {
          send(409, errorBody("CONFLICT", error.message));
          return;
        }
        throw error;
      }
    };

    try {
      const identity = options.verify(req.headers);
      if (!identity) throw new HttpError(401, "UNAUTHENTICATED", "Unverified");
      const url = new URL(req.url ?? "/", "http://gateway.local");
      const body = req.method === "GET" ? {} : await readJson(req);
      const requireWrite = () => {
        if (!canWrite(identity)) throw new HttpError(403, "FORBIDDEN", "Forbidden");
      };
      const requireInstance = (agentInstanceId: string): InstanceRow => {
        const instance = store.findInstance(identity.tenantId, identity.workspaceId, agentInstanceId);
        if (!instance) throw new HttpError(404, "NOT_FOUND", "Not found");
        return instance;
      };
      const requireSession = (sessionId: string): { session: SessionRow; instance: InstanceRow } => {
        const session = store.findSession(identity.tenantId, identity.workspaceId, sessionId);
        if (!session) throw new HttpError(404, "NOT_FOUND", "Not found");
        return { session, instance: requireInstance(session.agentInstanceId) };
      };
      const requireCapability = (instance: InstanceRow, feature: keyof InstanceCapabilities) => {
        if (!instance.capabilities[feature]) throw new HttpError(400, "UNSUPPORTED_CAPABILITY", `${feature} are false`);
      };
      const scope = (operation: string, resourceId: string): CommandScope => ({
        tenantId: identity.tenantId,
        workspaceId: identity.workspaceId,
        operation,
        resourceId,
      });

      if (req.method === "GET" && url.pathname === "/v1/capabilities") {
        send(200, { protocolVersion: "1.0", kind: "remote-hermes" });
        return;
      }

      if (req.method === "POST" && url.pathname === "/v1/agent-instances") {
        if (identity.role !== "tenant-admin") throw new HttpError(403, "FORBIDDEN", "Forbidden");
        if (typeof body.tenantId === "string" && body.tenantId !== identity.tenantId) throw new HttpError(404, "NOT_FOUND", "Not found");
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
        const instance = requireInstance(String(body.agentInstanceId));
        requireWrite();
        const upstream = await callUpstream(instance.upstreamUrl, "/v1/sessions", {
          method: "POST",
          body: { agentInstanceId: instance.agentInstanceId },
        });
        if (upstream.status >= 500) throw new Error(`upstream status ${upstream.status}`);
        if (typeof upstream.body.sessionId !== "string") throw new Error("upstream returned no session id");
        const session: SessionRow = {
          sessionId: `gws_${randomUUID()}`,
          upstreamSessionId: upstream.body.sessionId,
          tenantId: identity.tenantId,
          workspaceId: identity.workspaceId,
          actorId: identity.actorId,
          agentInstanceId: instance.agentInstanceId,
          upstreamUrl: instance.upstreamUrl,
          status: "idle",
        };
        store.saveSession(session);
        send(201, publicSession(session, 0));
        return;
      }

      const sessionMatch = url.pathname.match(/^\/v1\/sessions\/([^/]+)$/);
      if (req.method === "GET" && sessionMatch) {
        const { session } = requireSession(sessionMatch[1] ?? "");
        send(200, publicSession(session, events.after(session.sessionId, 0).at(-1)?.seq ?? 0));
        return;
      }

      const eventsMatch = url.pathname.match(/^\/v1\/sessions\/([^/]+)\/events$/);
      if (req.method === "GET" && eventsMatch) {
        const { session } = requireSession(eventsMatch[1] ?? "");
        await pullUpstreamEvents(session);
        const afterSeq = Number(url.searchParams.get("afterSeq") ?? "0");
        if (!Number.isInteger(afterSeq) || afterSeq < 0) throw new HttpError(400, "INVALID_ARGUMENT", "afterSeq");
        const ref = publicSession(session, 0);
        res.writeHead(200, { "content-type": "text/event-stream", "cache-control": "no-store" });
        for (const event of events.after(session.sessionId, afterSeq)) {
          const runtimeEvent = {
            tenantId: ref.tenantId,
            workspaceId: ref.workspaceId,
            actorId: ref.actorId,
            sessionId: ref.sessionId,
            agentInstanceId: ref.agentInstanceId,
            runtimeId: ref.runtimeId,
            ...event,
            traceId: event.eventId,
          };
          res.write(`id: ${event.seq}\nevent: ${event.type}\ndata: ${JSON.stringify(runtimeEvent)}\n\n`);
        }
        res.end();
        return;
      }

      const messageMatch = url.pathname.match(/^\/v1\/sessions\/([^/]+)\/messages$/);
      if (req.method === "POST" && messageMatch) {
        const { session } = requireSession(messageMatch[1] ?? "");
        requireWrite();
        await runCommand(scope("session.message", session.sessionId), body, async () => {
          const upstream = await callUpstream(session.upstreamUrl, `/v1/sessions/${session.upstreamSessionId}/messages`, {
            method: "POST",
            body: { text: body.text },
          });
          if (upstream.status >= 500) throw new Error(`upstream status ${upstream.status}`);
          if (typeof upstream.body.runId !== "string") throw new Error("upstream returned no run id");
          return { sessionId: session.sessionId, runId: upstream.body.runId, traceId: "trace-send" };
        });
        return;
      }

      const cancelMatch = url.pathname.match(/^\/v1\/sessions\/([^/]+)\/runs\/([^/]+)\/cancel$/);
      if (req.method === "POST" && cancelMatch) {
        const { session, instance } = requireSession(cancelMatch[1] ?? "");
        const runId = cancelMatch[2] ?? "";
        requireWrite();
        requireCapability(instance, "cancel");
        await runCommand(scope("run.cancel", `${session.sessionId}:${runId}`), body, async () => {
          const upstream = await callUpstream(session.upstreamUrl, `/v1/sessions/${session.upstreamSessionId}/runs/${runId}/cancel`, {
            method: "POST",
            body: {},
          });
          if (upstream.status >= 500) throw new Error(`upstream status ${upstream.status}`);
          if (upstream.status >= 400) throw new HttpError(upstream.status === 404 ? 404 : 409, "CONFLICT", "upstream refused cancel");
          return { runId, accepted: true };
        });
        return;
      }

      const decisionMatch = url.pathname.match(/^\/v1\/sessions\/([^/]+)\/approvals\/([^/]+)\/decision$/);
      if (req.method === "POST" && decisionMatch) {
        const { session, instance } = requireSession(decisionMatch[1] ?? "");
        const approvalId = decisionMatch[2] ?? "";
        requireWrite();
        requireCapability(instance, "approvals");
        const decision = body.decision;
        if (decision !== "approve" && decision !== "reject") throw new HttpError(400, "INVALID_ARGUMENT", "decision");
        await runCommand(scope("approval.decision", `${session.sessionId}:${approvalId}`), body, async () => {
          commands.decide({
            id: `${session.sessionId}:${approvalId}`,
            now: Date.now(),
            paramsHash: String(body.actionDigest ?? ""),
            decision,
          });
          const upstream = await callUpstream(
            session.upstreamUrl,
            `/v1/sessions/${session.upstreamSessionId}/approvals/${approvalId}/decision`,
            { method: "POST", body: { decision } },
          );
          if (upstream.status >= 500) {
            commands.recordUnknown(`${session.sessionId}:${approvalId}`, { decision, upstreamStatus: upstream.status });
            throw new Error(`upstream status ${upstream.status}`);
          }
          return { runId: approvalId, accepted: true };
        });
        return;
      }

      if (req.method === "POST" && url.pathname === "/v1/tasks") {
        const instance = requireInstance(String(body.agentInstanceId));
        requireWrite();
        requireCapability(instance, "tasks");
        await runCommand(scope("task.create", instance.agentInstanceId), body, async () => {
          const upstream = await callUpstream(instance.upstreamUrl, "/v1/tasks", {
            method: "POST",
            body: { agentInstanceId: instance.agentInstanceId, title: body.title },
          });
          if (upstream.status >= 500) throw new Error(`upstream status ${upstream.status}`);
          if (typeof upstream.body.taskId !== "string") throw new Error("upstream returned no task id");
          return { runId: upstream.body.taskId, taskId: upstream.body.taskId, traceId: "trace-task" };
        });
        return;
      }

      const toolsMatch = url.pathname.match(/^\/v1\/sessions\/([^/]+)\/tools(\/.*)?$/);
      if (toolsMatch) {
        requireSession(toolsMatch[1] ?? "");
        throw new HttpError(400, "UNSUPPORTED_CAPABILITY", "tool routing is not implemented by this gateway");
      }

      const statusMatch = url.pathname.match(/^\/v1\/agent-instances\/([^/]+)\/status$/);
      if (req.method === "GET" && statusMatch) {
        const instance = requireInstance(statusMatch[1] ?? "");
        const upstream = await callUpstream(instance.upstreamUrl, `/v1/agent-instances/${instance.agentInstanceId}/status`, { method: "GET" });
        send(200, {
          agentInstanceId: instance.agentInstanceId,
          status: upstream.body.status,
          capabilities: { protocolVersion: "1.0", ...instance.capabilities },
          updatedAt: new Date().toISOString(),
        });
        return;
      }

      throw new HttpError(404, "NOT_FOUND", "Not found");
    } catch (error) {
      if (res.headersSent) {
        res.end();
        return;
      }
      if (error instanceof HttpError) {
        send(error.status, errorBody(error.code, error.message));
        return;
      }
      send(502, errorBody("UPSTREAM_UNAVAILABLE", error instanceof Error ? error.message : "upstream", true));
    }
  });

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("gateway did not bind");
  const url = `http://127.0.0.1:${address.port}`;
  return {
    url,
    fetch: (path, init) => fetch(new URL(path, url), init),
    close: () =>
      new Promise((resolve, reject) => {
        server.close((error) => {
          store.close();
          if (error) reject(error);
          else resolve();
        });
      }),
  };
}
