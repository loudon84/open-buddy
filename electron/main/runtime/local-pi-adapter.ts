import { readFile } from "node:fs/promises";
import { assertLocalScope, mapPiHostEvent } from "../../../packages/runtime/openbuddy-runtime-adapter/src/local-pi-events";
import type {
  CallOptions,
  Capabilities,
  ConnectionConfig,
  MessageInput,
  RequestContext,
  RunReceipt,
  RuntimeAdapter,
  RuntimeEvent,
  Scope,
  Session,
  SessionRef,
  Task,
  TaskInput,
  ToolDescriptor,
} from "../../../packages/runtime/openbuddy-runtime-adapter/src/types";
import { LocalPiError } from "../../../packages/runtime/openbuddy-runtime-adapter/src/local-pi-events";

export type PiHostEvent = { type?: string; [field: string]: unknown };

export interface LocalPiPort {
  loadEntries(sessionPath: string): Promise<Array<Record<string, unknown>>>;
  continueSession(sessionPath: string): Promise<{ sessionId: string; sessionPath: string }>;
  send(text: string): Promise<{ runId: string }>;
  abort(): Promise<void>;
  subscribe(listener: (event: PiHostEvent) => void): () => void;
  respondPermission(requestId: string, decision: "approve" | "reject"): Promise<void>;
}

function permissionId(event: PiHostEvent): string | null {
  const id = event.requestId ?? event.id;
  return typeof id === "string" && id ? id : null;
}

/**
 * Reads an existing Pi JSONL session. It does not write, rename, or reformat the file.
 */
export async function readPiJsonl(sessionPath: string): Promise<Array<Record<string, unknown>>> {
  const text = await readFile(sessionPath, "utf8");
  return text
    .split(/\r?\n/)
    .filter((line) => line.length > 0)
    .map((line) => JSON.parse(line) as Record<string, unknown>);
}

/**
 * Wraps the existing Pi session runtime behind the project RuntimeAdapter.
 * local-pi is not a remote Hermes process.
 */
export class LocalPiAdapter implements RuntimeAdapter {
  private connected: Scope | null = null;
  private seq = 0;
  private sessionId = "";
  private runId: string | null = null;
  private readonly events: RuntimeEvent[] = [];
  private readonly pending = new Set<string>();
  private readonly waiters = new Set<() => void>();
  private unsubscribe: (() => void) | null = null;

  constructor(
    private readonly port: LocalPiPort & { installationId: string },
  ) {}

  async connect(config: ConnectionConfig, _options?: CallOptions): Promise<Capabilities> {
    assertLocalScope(config.scope.tenantId, this.port.installationId);
    this.connected = config.scope;
    this.unsubscribe?.();
    this.unsubscribe = this.port.subscribe((event) => this.record(event));
    return {
      protocolVersion: "1.0",
      runtimeId: `local-pi:${this.port.installationId}`,
      kind: "local-pi",
      features: {
        resume: true,
        cancel: true,
        approvals: true,
        tools: true,
        tasks: false,
        artifacts: false,
      },
      toolSchemaVersion: "pi-jsonl-1",
    };
  }

  async disconnect(): Promise<void> {
    this.unsubscribe?.();
    this.unsubscribe = null;
    this.connected = null;
    this.wake();
  }

  async openExisting(sessionPath: string, scope: Scope): Promise<Session> {
    this.requireLocal(scope);
    const entries = await this.port.loadEntries(sessionPath);
    const continued = await this.port.continueSession(sessionPath);
    this.sessionId = continued.sessionId;
    const now = new Date(0).toISOString();
    return {
      ...scope,
      sessionId: continued.sessionId,
      agentInstanceId: "local-pi",
      runtimeId: `local-pi:${this.port.installationId}`,
      status: "idle",
      revision: entries.length,
      lastSeq: entries.length,
      createdAt: now,
      updatedAt: now,
    };
  }

  async createSession(input: RequestContext & { agentInstanceId: string }): Promise<Session> {
    return this.openExisting(input.agentInstanceId, input);
  }

  async getSession(ref: SessionRef): Promise<Session> {
    this.requireLocal(ref);
    const now = new Date(0).toISOString();
    return { ...ref, status: "idle", revision: 0, lastSeq: this.seq, createdAt: now, updatedAt: now };
  }

  async sendMessage(input: MessageInput): Promise<RunReceipt> {
    this.requireLocal(input);
    const sent = await this.port.send(input.text);
    this.runId = sent.runId;
    return {
      sessionId: input.sessionId,
      runId: sent.runId,
      status: "accepted",
      traceId: input.requestId,
    };
  }

  async *stream(ref: SessionRef, afterSeq: number, options?: CallOptions): AsyncIterable<RuntimeEvent> {
    this.requireLocal(ref);
    let cursor = afterSeq;
    while (this.connected && !options?.signal?.aborted) {
      const next = this.events.filter((event) => event.seq > cursor && event.sessionId === ref.sessionId);
      for (const event of next) {
        cursor = event.seq;
        yield event;
      }
      if (next.length === 0) await this.nextEvent(options?.signal);
    }
  }

  async cancel(ref: SessionRef, _runId: string, context: RequestContext): Promise<{ accepted: boolean }> {
    this.requireLocal(ref);
    this.requireLocal(context);
    await this.port.abort();
    return { accepted: true };
  }

  async resolveApproval(
    ref: SessionRef,
    approvalId: string,
    decision: "approve" | "reject",
    context: RequestContext,
  ): Promise<{ accepted: boolean }> {
    this.requireLocal(ref);
    this.requireLocal(context);
    if (!this.pending.has(approvalId)) throw new LocalPiError("NOT_FOUND", "no pending local permission request");
    await this.port.respondPermission(approvalId, decision);
    this.pending.delete(approvalId);
    return { accepted: true };
  }

  async executeTask(_input: TaskInput): Promise<Task> {
    throw new LocalPiError("UNSUPPORTED_CAPABILITY", "local Pi does not execute enterprise tasks");
  }

  async listTools(_ref: SessionRef): Promise<ToolDescriptor[]> {
    return [];
  }

  async executeTool(): Promise<{ invocationId: string; runId: string }> {
    throw new LocalPiError("UNSUPPORTED_CAPABILITY", "local Pi tools stay on the existing host");
  }

  async queryStatus(agentInstanceId: string): Promise<{ agentInstanceId: string; status: string; capabilities: Capabilities; updatedAt: string }> {
    return {
      agentInstanceId,
      status: this.connected ? "connected" : "offline",
      capabilities: {
        protocolVersion: "1.0",
        runtimeId: `local-pi:${this.port.installationId}`,
        kind: "local-pi",
        features: { resume: true, cancel: true, approvals: true, tools: true, tasks: false, artifacts: false },
        toolSchemaVersion: "pi-jsonl-1",
      },
      updatedAt: new Date(0).toISOString(),
    };
  }

  mapHostEvent(event: PiHostEvent): { type: ReturnType<typeof mapPiHostEvent> } {
    return { type: mapPiHostEvent(event) };
  }

  private record(event: PiHostEvent): void {
    const scope = this.connected;
    if (!scope) return;
    const type = mapPiHostEvent(event);
    const approvalId = permissionId(event);
    if (type === "approval.required" && approvalId) this.pending.add(approvalId);
    if (type === "approval.resolved" && approvalId) this.pending.delete(approvalId);
    this.seq += 1;
    this.events.push({
      ...scope,
      sessionId: this.sessionId,
      agentInstanceId: "local-pi",
      runtimeId: `local-pi:${this.port.installationId}`,
      eventId: `local-${this.seq}`,
      seq: this.seq,
      runId: this.runId,
      type,
      occurredAt: new Date().toISOString(),
      traceId: "local-pi",
      payload: type.startsWith("approval.") && approvalId ? { ...event, approvalId } : event,
    });
    if (this.events.length > 1000) this.events.shift();
    this.wake();
  }

  private nextEvent(signal?: AbortSignal): Promise<void> {
    return new Promise((resolve) => {
      if (signal?.aborted) return resolve();
      const done = () => {
        this.waiters.delete(done);
        signal?.removeEventListener("abort", done);
        resolve();
      };
      this.waiters.add(done);
      signal?.addEventListener("abort", done, { once: true });
    });
  }

  private wake(): void {
    for (const waiter of [...this.waiters]) waiter();
  }

  private requireLocal(scope: Scope): void {
    assertLocalScope(scope.tenantId, this.port.installationId);
    if (!this.connected) {
      throw new LocalPiError("UNAUTHENTICATED", "local Pi adapter is not connected");
    }
  }
}
