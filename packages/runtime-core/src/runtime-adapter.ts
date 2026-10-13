export type RuntimeType = "local_process" | "remote_gateway" | "embedded" | "container";

export type RuntimePhase =
  | "UNINITIALIZED"
  | "INIT"
  | "READY"
  | "START"
  | "RUNNING"
  | "ERROR"
  | "STOPPED";

export interface RuntimeHealth {
  status: "healthy" | "unhealthy";
  version: string;
  endpoint: string;
  message?: string;
}

export interface RuntimeRequest {
  text: string;
  sessionId?: string;
}

export interface RuntimeResponse {
  sessionId: string;
  text: string;
  traceId: string;
}

export interface Capability {
  id: string;
  name: string;
}

export interface RuntimeAdapter {
  readonly id: string;
  readonly name: string;
  readonly type: RuntimeType;
  start(): Promise<void>;
  stop(): Promise<void>;
  health(): Promise<RuntimeHealth>;
  chat(request: RuntimeRequest): Promise<RuntimeResponse>;
  listCapabilities(): Promise<Capability[]>;
}

const EDGES: Record<RuntimePhase, readonly RuntimePhase[]> = {
  UNINITIALIZED: ["INIT"],
  INIT: ["READY"],
  READY: ["START"],
  START: ["RUNNING", "ERROR"],
  RUNNING: ["STOPPED"],
  ERROR: [],
  STOPPED: ["START"],
};

export function assertTransition(from: RuntimePhase, to: RuntimePhase): void {
  if (!EDGES[from].includes(to)) {
    throw new Error(`illegal runtime transition ${from} -> ${to}`);
  }
}
