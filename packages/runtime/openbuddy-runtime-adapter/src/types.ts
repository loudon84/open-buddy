/**
 * Project runtime contract v1.
 * These paths are the contract this repository will implement.
 * They are not observed upstream Hermes routes. See the P0-03 matrix.
 * Portable: this module must not import Electron.
 */

export type RuntimeKind = "local-pi" | "remote-hermes" | string;

/** Writes use `local-pi` or `remote-hermes:<instance>`. `pi` and `hermes` are read aliases. */
export function normalizeRuntimeId(id: string): string {
  if (id === "pi" || id === "local-pi") return "local-pi";
  if (id === "hermes" || id === "remote-hermes") return "remote-hermes";
  return id;
}

export interface Scope {
  tenantId: string;
  workspaceId: string;
  actorId: string;
}

export type SessionRef = Scope & {
  sessionId: string;
  agentInstanceId: string;
  runtimeId: string;
};

export type ErrorCode =
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "INVALID_ARGUMENT"
  | "UNSUPPORTED_CAPABILITY"
  | "RATE_LIMITED"
  | "UPSTREAM_UNAVAILABLE"
  | "RESUME_EXPIRED"
  | "TIMEOUT"
  | "CANCELLED";

export interface RuntimeError {
  code: ErrorCode;
  message: string;
  retryable: boolean;
  traceId: string;
}

export interface Capabilities {
  protocolVersion: "1.0";
  runtimeId: string;
  kind: RuntimeKind;
  features: {
    resume: boolean;
    cancel: boolean;
    approvals: boolean;
    tools: boolean;
    tasks: boolean;
    artifacts: boolean;
    attachments: boolean;
    steer: boolean;
    followUp: boolean;
    modelSwitch: boolean;
    liveStream: boolean;
  };
  toolSchemaVersion: string;
}

export interface CallOptions {
  signal?: AbortSignal;
  timeoutMs?: number;
}

export type RequestContext = Scope & {
  requestId: string;
  idempotencyKey: string;
};

export interface ConnectionConfig {
  endpointRef: string;
  credentialRef: string;
  scope: Scope;
}

export interface Session extends SessionRef {
  status: "idle" | "running" | "waiting_approval" | "closed";
  revision: number;
  lastSeq: number;
  createdAt: string;
  updatedAt: string;
}

export type MessageInput = RequestContext & {
  sessionId: string;
  text: string;
  artifactIds: string[];
};

export interface RunReceipt {
  sessionId: string;
  runId: string;
  status: "accepted";
  traceId: string;
}

export type TaskInput = MessageInput & { title: string };

export interface Task {
  taskId: string;
  sessionId: string;
  runId: string;
  status: "queued" | "running" | "waiting_approval" | "succeeded" | "failed" | "cancelled";
}

export interface ToolDescriptor {
  name: string;
  inputSchema: object;
  outputSchema: object;
  permission: string;
  sideEffect: "read" | "write";
  version: string;
}

export type EventType =
  | "run.accepted"
  | "message.delta"
  | "tool.started"
  | "tool.result"
  | "approval.required"
  | "approval.resolved"
  | "artifact.created"
  | "run.completed"
  | "run.failed"
  | "run.cancelled"
  | "session.updated";

export type RuntimeEvent = SessionRef & {
  eventId: string;
  seq: number;
  runId: string | null;
  type: EventType;
  occurredAt: string;
  traceId: string;
  payload: unknown;
};

export interface RuntimeStatus {
  runtimeId: string;
  kind: RuntimeKind;
  state: "disconnected" | "connecting" | "connected" | "degraded" | "error" | "stopped";
  activeRuns: number;
  capabilities?: Capabilities;
  lastError?: RuntimeError;
  checkedAt: string;
}

export interface RuntimeConnection {
  connect(config: ConnectionConfig, options?: CallOptions): Promise<Capabilities>;
  disconnect(options?: CallOptions): Promise<void>;
  queryStatus(agentInstanceId: string, options?: CallOptions): Promise<RuntimeStatus>;
  listTools(ref: SessionRef, options?: CallOptions): Promise<ToolDescriptor[]>;
}

export interface RuntimeSessionPort {
  createSession(
    input: RequestContext & { agentInstanceId: string; workspaceId?: string },
    options?: CallOptions,
  ): Promise<Session>;
  getSession(ref: SessionRef, options?: CallOptions): Promise<Session>;
  sendMessage(input: MessageInput, options?: CallOptions): Promise<RunReceipt>;
  stream(ref: SessionRef, afterSeq: number, options?: CallOptions): AsyncIterable<RuntimeEvent>;
  cancel(
    ref: SessionRef,
    runId: string,
    context: RequestContext,
    options?: CallOptions,
  ): Promise<{ accepted: boolean }>;
  resolveApproval(
    ref: SessionRef,
    approvalId: string,
    decision: "approve" | "reject",
    context: RequestContext,
    options?: CallOptions,
  ): Promise<{ accepted: boolean }>;
  executeTask(input: TaskInput, options?: CallOptions): Promise<Task>;
  executeTool(
    ref: SessionRef,
    toolName: string,
    input: { input: object; approvalId?: string },
    context: RequestContext,
    options?: CallOptions,
  ): Promise<{ invocationId: string; runId: string }>;
}

export interface RuntimeAdapter extends RuntimeConnection, RuntimeSessionPort {}

export type RuntimePhase =
  | "idle"
  | "accepted"
  | "running"
  | "waiting"
  | "completed"
  | "failed"
  | "cancel-pending"
  | "cancelled"
  | "disconnected";

/** What the desktop main process pushes to the renderer for one enterprise session. */
export type RuntimeEmission =
  | { kind: "event"; sessionId: string; event: RuntimeEvent }
  | { kind: "stream-error"; sessionId: string; code: string; message: string; retryable: boolean };
