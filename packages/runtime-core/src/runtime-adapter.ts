import type { IdentityContext } from "@openbuddy/shared-types";

export type { IdentityContext };

export type RuntimeType = "local_process" | "remote_gateway" | "embedded" | "container";

export type RuntimeLifecyclePhase =
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

/** @deprecated RA-08 removes chat(). Session traffic uses the canonical RuntimeAdapter. */
export interface RuntimeRequest {
  text: string;
  sessionId?: string;
  identityContext?: IdentityContext;
}

/** @deprecated RA-08 removes chat(). */
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
  /** @deprecated Use the session contract. Removed from the production prompt path. */
  chat(request: RuntimeRequest): Promise<RuntimeResponse>;
  listCapabilities(): Promise<Capability[]>;
}

const EDGES: Record<RuntimeLifecyclePhase, readonly RuntimeLifecyclePhase[]> = {
  UNINITIALIZED: ["INIT"],
  INIT: ["READY"],
  READY: ["START"],
  START: ["RUNNING", "ERROR"],
  RUNNING: ["STOPPED"],
  ERROR: [],
  STOPPED: ["START"],
};

export function assertTransition(from: RuntimeLifecyclePhase, to: RuntimeLifecyclePhase): void {
  if (!EDGES[from].includes(to)) {
    throw new Error(`illegal runtime transition ${from} -> ${to}`);
  }
}
