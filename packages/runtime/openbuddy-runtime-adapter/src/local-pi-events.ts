import type { ErrorCode, EventType, RuntimeError } from "./types.ts";

export class LocalPiError extends Error implements RuntimeError {
  readonly retryable = false;
  readonly traceId: string;

  constructor(
    readonly code: ErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "LocalPiError";
    this.traceId = "local-pi";
  }
}

export function assertLocalScope(tenantId: string, installationId: string): void {
  if (tenantId !== `local:${installationId}`) {
    throw new LocalPiError("FORBIDDEN", "enterprise scope is not a local Pi session");
  }
}

export function mapPiHostEvent(event: { type?: string }): EventType {
  switch (event.type) {
    case "tool_call":
      return "tool.started";
    case "tool_result":
      return "tool.result";
    case "hook/permission-request":
      return "approval.required";
    case "hook/permission-resolved":
      return "approval.resolved";
    case "error":
      return "run.failed";
    case "aborted":
      return "run.cancelled";
    case "agent_message_chunk":
      return "message.delta";
    default:
      return "session.updated";
  }
}
