import { randomUUID } from "node:crypto";
import type { TokenSource } from "../../../packages/runtime/openbuddy-hermes-client/src/transport";
import type { RequestContext, RuntimeEmission, SessionRef } from "../../../packages/runtime/openbuddy-runtime-adapter/src/types";
import { RemoteHermesAdapter, RemoteRuntimeError } from "./remote-hermes-adapter";

export interface EnterpriseRuntimeStatus {
  enabled: boolean;
  connected: boolean;
  tenantId: string | null;
}

export type EnterpriseRuntimeEmission = RuntimeEmission;

export interface EnterpriseRuntimeDeps {
  endpoint: string | undefined;
  identity: () => { tenantId: string; actorId: string } | null;
  tokens: TokenSource;
  emit: (item: EnterpriseRuntimeEmission) => void;
  log?: (line: string) => void;
  pollIntervalMs?: number;
}

const loopbackHosts = new Set(["127.0.0.1", "localhost", "[::1]"]);

export function resolveGatewayEndpoint(raw: string | undefined): string | undefined {
  const value = raw?.trim();
  if (!value) return undefined;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return undefined;
  }
  if (url.username || url.password) return undefined;
  if (url.protocol === "https:" || (url.protocol === "http:" && loopbackHosts.has(url.hostname))) return url.origin;
  return undefined;
}

function fail(code: RemoteRuntimeError["code"], message: string): never {
  throw new RemoteRuntimeError(code, message, false, "desktop-main", 0);
}

/**
 * Owns the remote runtime on the desktop main process. The renderer only names sessions this
 * controller created; tenant and actor come from the signed-in identity, never from the renderer.
 */
export class EnterpriseRuntimeController {
  private adapter: RemoteHermesAdapter | null = null;
  private readonly sessions = new Map<string, SessionRef>();
  private readonly streams = new Map<string, AbortController>();

  constructor(private readonly deps: EnterpriseRuntimeDeps) {}

  status(): EnterpriseRuntimeStatus {
    return {
      enabled: Boolean(this.deps.endpoint),
      connected: this.adapter !== null,
      tenantId: this.adapter ? (this.deps.identity()?.tenantId ?? null) : null,
    };
  }

  async connect(): Promise<EnterpriseRuntimeStatus> {
    if (!this.deps.endpoint) fail("UNSUPPORTED_CAPABILITY", "enterprise gateway is not configured");
    if (!this.deps.identity()) fail("UNAUTHENTICATED", "sign in before connecting to the enterprise gateway");
    const adapter = new RemoteHermesAdapter({
      endpoint: this.deps.endpoint,
      tokens: this.deps.tokens,
      log: this.deps.log ?? (() => {}),
      pollIntervalMs: this.deps.pollIntervalMs,
    });
    await adapter.connect();
    this.adapter = adapter;
    return this.status();
  }

  async createSession(input: { agentInstanceId: string; workspaceId: string; requestId?: string }): Promise<{ sessionId: string }> {
    const session = await this.requireAdapter().createSession({
      ...this.context(input.workspaceId, input.requestId),
      agentInstanceId: input.agentInstanceId,
    });
    this.sessions.set(session.sessionId, {
      tenantId: session.tenantId,
      workspaceId: session.workspaceId,
      actorId: session.actorId,
      sessionId: session.sessionId,
      agentInstanceId: session.agentInstanceId,
      runtimeId: session.runtimeId,
    });
    return { sessionId: session.sessionId };
  }

  async send(input: { sessionId: string; text: string; requestId?: string }): Promise<{ runId: string }> {
    const ref = this.requireSession(input.sessionId);
    const receipt = await this.requireAdapter().sendMessage({
      ...this.context(ref.workspaceId, input.requestId),
      sessionId: ref.sessionId,
      text: input.text,
      artifactIds: [],
    });
    return { runId: receipt.runId };
  }

  async cancel(input: { sessionId: string; runId: string; requestId?: string }): Promise<{ accepted: boolean }> {
    const ref = this.requireSession(input.sessionId);
    return this.requireAdapter().cancel(ref, input.runId, this.context(ref.workspaceId, input.requestId));
  }

  async decide(input: {
    sessionId: string;
    approvalId: string;
    decision: "approve" | "reject";
    actionDigest: string;
    requestId?: string;
  }): Promise<{ accepted: boolean }> {
    const ref = this.requireSession(input.sessionId);
    return this.requireAdapter().resolveApproval(ref, input.approvalId, input.decision, {
      ...this.context(ref.workspaceId, input.requestId),
      actionDigest: input.actionDigest,
    });
  }

  subscribe(input: { sessionId: string; afterSeq: number }): void {
    const ref = this.requireSession(input.sessionId);
    const adapter = this.requireAdapter();
    this.unsubscribe(ref.sessionId);
    const abort = new AbortController();
    this.streams.set(ref.sessionId, abort);
    void (async () => {
      try {
        for await (const event of adapter.stream(ref, input.afterSeq, { signal: abort.signal })) {
          this.deps.emit({ kind: "event", sessionId: ref.sessionId, event });
        }
      } catch (error) {
        if (abort.signal.aborted) return;
        const runtime = error instanceof RemoteRuntimeError ? error : null;
        this.deps.emit({
          kind: "stream-error",
          sessionId: ref.sessionId,
          code: runtime?.code ?? "UPSTREAM_UNAVAILABLE",
          message: error instanceof Error ? error.message : "stream failed",
          retryable: runtime?.retryable ?? true,
        });
      } finally {
        if (this.streams.get(ref.sessionId) === abort) this.streams.delete(ref.sessionId);
      }
    })();
  }

  unsubscribe(sessionId: string): void {
    this.streams.get(sessionId)?.abort();
    this.streams.delete(sessionId);
  }

  async dispose(): Promise<void> {
    for (const sessionId of [...this.streams.keys()]) this.unsubscribe(sessionId);
    this.sessions.clear();
    await this.adapter?.disconnect();
    this.adapter = null;
  }

  private requireAdapter(): RemoteHermesAdapter {
    if (!this.adapter) fail("UNAUTHENTICATED", "enterprise runtime is not connected");
    return this.adapter;
  }

  private requireSession(sessionId: string): SessionRef {
    const ref = this.sessions.get(sessionId);
    if (!ref) fail("NOT_FOUND", "unknown enterprise session");
    const identity = this.deps.identity();
    if (!identity || identity.tenantId !== ref.tenantId || identity.actorId !== ref.actorId) {
      this.unsubscribe(sessionId);
      this.sessions.delete(sessionId);
      fail("NOT_FOUND", "unknown enterprise session");
    }
    return ref;
  }

  private context(workspaceId: string, requestId?: string): RequestContext {
    const identity = this.deps.identity();
    if (!identity) fail("UNAUTHENTICATED", "signed out");
    const id = requestId ?? randomUUID();
    return { tenantId: identity.tenantId, workspaceId, actorId: identity.actorId, requestId: id, idempotencyKey: id };
  }
}
