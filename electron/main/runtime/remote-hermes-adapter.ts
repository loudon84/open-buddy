import { HermesClient, type HermesClientOptions } from "../../../packages/runtime/openbuddy-hermes-client/src/client";
import type {
  CallOptions,
  Capabilities,
  ConnectionConfig,
  ErrorCode,
  MessageInput,
  RequestContext,
  RunReceipt,
  RuntimeAdapter,
  RuntimeError,
  RuntimeEvent,
  RuntimeStatus,
  Session,
  SessionRef,
  Task,
  TaskInput,
  ToolDescriptor,
} from "../../../packages/runtime/openbuddy-runtime-adapter/src/types";

export class RemoteRuntimeError extends Error implements RuntimeError {
  constructor(
    readonly code: ErrorCode,
    message: string,
    readonly retryable: boolean,
    readonly traceId: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "RemoteRuntimeError";
  }
}

export type RemoteHermesAdapterOptions = HermesClientOptions & { pollIntervalMs?: number };

function parseSse(text: string): RuntimeEvent[] {
  const events: RuntimeEvent[] = [];
  for (const block of text.split(/\r?\n\r?\n/)) {
    const data = block
      .split(/\r?\n/)
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice(5).trimStart())
      .join("\n");
    if (data) events.push(JSON.parse(data) as RuntimeEvent);
  }
  return events;
}

function wait(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (signal?.aborted) return resolve();
    const timer = setTimeout(done, ms);
    signal?.addEventListener("abort", done, { once: true });
    function done() {
      clearTimeout(timer);
      signal?.removeEventListener("abort", done);
      resolve();
    }
  });
}

/**
 * Main-process adapter. The access token stays in the TokenSource owned by main.
 * This file does not import Electron APIs; the host passes the token source in.
 */
export class RemoteHermesAdapter implements RuntimeAdapter {
  readonly client: HermesClient;
  private readonly pollIntervalMs: number;

  constructor(options: RemoteHermesAdapterOptions) {
    this.client = new HermesClient(options);
    this.pollIntervalMs = options.pollIntervalMs ?? 500;
  }

  async connect(_config?: ConnectionConfig, _options?: CallOptions): Promise<Capabilities> {
    const handshake = await this.client.connect();
    return {
      protocolVersion: "1.0",
      runtimeId: "remote-hermes",
      kind: handshake.kind,
      features: handshake.features as Capabilities["features"],
      toolSchemaVersion: "1.0",
    };
  }

  async disconnect(): Promise<void> {}

  async createSession(input: RequestContext & { agentInstanceId: string }, options?: CallOptions): Promise<Session> {
    const body = await this.call<Record<string, unknown>>(
      "POST",
      "/v1/sessions",
      input,
      { agentInstanceId: input.agentInstanceId, workspaceId: input.workspaceId },
      options,
    );
    return this.toSession(body);
  }

  async getSession(ref: SessionRef, options?: CallOptions): Promise<Session> {
    const body = await this.call<Record<string, unknown>>("GET", `/v1/sessions/${encodeURIComponent(ref.sessionId)}`, null, undefined, options);
    return this.toSession(body);
  }

  sendMessage(input: MessageInput, options?: CallOptions): Promise<RunReceipt> {
    return this.call<RunReceipt>(
      "POST",
      `/v1/sessions/${encodeURIComponent(input.sessionId)}/messages`,
      input,
      { text: input.text, artifactIds: input.artifactIds },
      options,
    );
  }

  async *stream(ref: SessionRef, afterSeq: number, options?: CallOptions): AsyncIterable<RuntimeEvent> {
    let cursor = afterSeq;
    let idle = this.pollIntervalMs;
    while (!options?.signal?.aborted) {
      const response = await this.client.transport.request(
        `/v1/sessions/${encodeURIComponent(ref.sessionId)}/events?afterSeq=${cursor}`,
        {
          method: "GET",
          headers: { accept: "text/event-stream" },
          signal: AbortSignal.any([AbortSignal.timeout(options?.timeoutMs ?? 30_000), ...(options?.signal ? [options.signal] : [])]),
        },
      ).catch((error: unknown) => {
        if (options?.signal?.aborted) return null;
        throw error;
      });
      if (!response) return;
      if (!response.ok) throw await this.toError(response);
      const page = parseSse(await response.text());
      if (page.length === 0) idle = Math.min(idle * 2, 2000);
      else idle = this.pollIntervalMs;
      for (const event of page) {
        if (event.seq <= cursor) continue;
        cursor = event.seq;
        yield event;
      }
      await wait(idle, options?.signal);
    }
  }

  cancel(ref: SessionRef, runId: string, context: RequestContext, options?: CallOptions): Promise<{ accepted: boolean }> {
    return this.call(
      "POST",
      `/v1/sessions/${encodeURIComponent(ref.sessionId)}/runs/${encodeURIComponent(runId)}/cancel`,
      context,
      {},
      options,
    );
  }

  resolveApproval(
    ref: SessionRef,
    approvalId: string,
    decision: "approve" | "reject",
    context: RequestContext & { actionDigest?: string },
    options?: CallOptions,
  ): Promise<{ accepted: boolean }> {
    return this.call(
      "POST",
      `/v1/sessions/${encodeURIComponent(ref.sessionId)}/approvals/${encodeURIComponent(approvalId)}/decision`,
      context,
      { decision, actionDigest: context.actionDigest },
      options,
    );
  }

  async executeTask(input: TaskInput & { agentInstanceId?: string }, options?: CallOptions): Promise<Task> {
    const body = await this.call<{ taskId: string; runId: string }>(
      "POST",
      "/v1/tasks",
      input,
      { agentInstanceId: input.agentInstanceId, sessionId: input.sessionId, title: input.title },
      options,
    );
    return { taskId: body.taskId, sessionId: input.sessionId, runId: body.runId, status: "queued" };
  }

  async listTools(ref: SessionRef, options?: CallOptions): Promise<ToolDescriptor[]> {
    const body = await this.call<{ tools: ToolDescriptor[] }>("GET", `/v1/sessions/${encodeURIComponent(ref.sessionId)}/tools`, null, undefined, options);
    return body.tools;
  }

  executeTool(
    ref: SessionRef,
    toolName: string,
    input: { input: object; approvalId?: string },
    context: RequestContext,
    options?: CallOptions,
  ): Promise<{ invocationId: string; runId: string }> {
    return this.call(
      "POST",
      `/v1/sessions/${encodeURIComponent(ref.sessionId)}/tools/${encodeURIComponent(toolName)}/invocations`,
      context,
      input,
      options,
    );
  }

  async queryStatus(agentInstanceId: string, options?: CallOptions): Promise<RuntimeStatus> {
    const body = await this.call<Partial<RuntimeStatus> & { status?: string }>(
      "GET",
      `/v1/agent-instances/${encodeURIComponent(agentInstanceId)}/status`,
      null,
      undefined,
      options,
    );
    return {
      runtimeId: body.runtimeId ?? `remote-hermes:${agentInstanceId}`,
      kind: "remote-hermes",
      state: body.state ?? "disconnected",
      activeRuns: body.activeRuns ?? 0,
      capabilities: body.capabilities,
      checkedAt: body.checkedAt ?? new Date(0).toISOString(),
    };
  }

  private async call<T>(
    method: string,
    path: string,
    context: RequestContext | null,
    body: unknown,
    options?: CallOptions,
  ): Promise<T> {
    const headers: Record<string, string> = {};
    if (context) {
      headers["idempotency-key"] = context.idempotencyKey;
      headers["x-request-id"] = context.requestId;
    }
    const signal = AbortSignal.any([
      AbortSignal.timeout(options?.timeoutMs ?? 15_000),
      ...(options?.signal ? [options.signal] : []),
    ]);
    let response: Response;
    try {
      response = await this.client.transport.request(path, { method, body, headers, signal });
    } catch (error) {
      if (options?.signal?.aborted) throw new RemoteRuntimeError("CANCELLED", "request cancelled", false, "", 0);
      if (signal?.aborted) throw new RemoteRuntimeError("TIMEOUT", "request timed out", true, "", 0);
      throw new RemoteRuntimeError("UPSTREAM_UNAVAILABLE", error instanceof Error ? error.message : "network", true, "", 0);
    }
    if (!response.ok) throw await this.toError(response);
    return (await response.json()) as T;
  }

  private async toError(response: Response): Promise<RemoteRuntimeError> {
    const text = await response.text();
    try {
      const { error } = JSON.parse(text) as { error: RuntimeError };
      return new RemoteRuntimeError(error.code, error.message, error.retryable, error.traceId, response.status);
    } catch {
      const code: ErrorCode = response.status === 401 ? "UNAUTHENTICATED" : response.status === 403 ? "FORBIDDEN" : "UPSTREAM_UNAVAILABLE";
      return new RemoteRuntimeError(code, `gateway status ${response.status}`, response.status >= 500, "", response.status);
    }
  }

  private toSession(body: Record<string, unknown>): Session {
    const now = new Date().toISOString();
    return {
      sessionId: String(body.sessionId),
      tenantId: String(body.tenantId),
      workspaceId: String(body.workspaceId),
      actorId: String(body.actorId),
      agentInstanceId: String(body.agentInstanceId),
      runtimeId: String(body.runtimeId),
      status: (body.status as Session["status"]) ?? "idle",
      revision: Number(body.revision ?? 0),
      lastSeq: Number(body.lastSeq ?? 0),
      createdAt: String(body.createdAt ?? now),
      updatedAt: String(body.updatedAt ?? now),
    };
  }
}
