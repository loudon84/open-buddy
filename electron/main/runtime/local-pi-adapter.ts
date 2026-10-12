import { readFile } from "node:fs/promises";
import { assertLocalScope, mapPiHostEvent } from "../../../packages/runtime/openbuddy-runtime-adapter/src/local-pi-events.ts";
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
} from "../../../packages/runtime/openbuddy-runtime-adapter/src/types.ts";
import { LocalPiError } from "../../../packages/runtime/openbuddy-runtime-adapter/src/local-pi-events.ts";

export interface LocalPiPort {
  loadEntries(sessionPath: string): Promise<Array<Record<string, unknown>>>;
  continueSession(sessionPath: string): Promise<{ sessionId: string; sessionPath: string }>;
  send(text: string): Promise<{ runId: string }>;
  abort(): Promise<void>;
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

  constructor(
    private readonly port: LocalPiPort & { installationId: string },
  ) {}

  async connect(config: ConnectionConfig, _options?: CallOptions): Promise<Capabilities> {
    assertLocalScope(config.scope.tenantId, this.port.installationId);
    this.connected = config.scope;
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
    this.connected = null;
  }

  async openExisting(sessionPath: string, scope: Scope): Promise<Session> {
    this.requireLocal(scope);
    const entries = await this.port.loadEntries(sessionPath);
    const continued = await this.port.continueSession(sessionPath);
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
    return {
      sessionId: input.sessionId,
      runId: sent.runId,
      status: "accepted",
      traceId: input.requestId,
    };
  }

  async *stream(ref: SessionRef, afterSeq: number): AsyncIterable<RuntimeEvent> {
    this.requireLocal(ref);
    if (afterSeq < 0) return;
  }

  async cancel(ref: SessionRef, _runId: string, context: RequestContext): Promise<{ accepted: boolean }> {
    this.requireLocal(ref);
    this.requireLocal(context);
    await this.port.abort();
    return { accepted: true };
  }

  async resolveApproval(): Promise<{ accepted: boolean }> {
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

  mapHostEvent(event: { type?: string }): { type: ReturnType<typeof mapPiHostEvent> } {
    return { type: mapPiHostEvent(event) };
  }

  private requireLocal(scope: Scope): void {
    assertLocalScope(scope.tenantId, this.port.installationId);
    if (!this.connected) {
      throw new LocalPiError("UNAUTHENTICATED", "local Pi adapter is not connected");
    }
  }
}
