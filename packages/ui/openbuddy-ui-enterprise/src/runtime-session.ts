import type { RuntimeEmission, RuntimePhase } from "../../../runtime/openbuddy-runtime-adapter/src/types";
import { reduceRuntime } from "./runtime-panel";

export interface PendingApproval {
  approvalId: string;
  actionDigest: string;
  summary: string;
}

export interface RuntimeSessionView {
  sessionId: string;
  phase: RuntimePhase;
  runId: string | null;
  lastSeq: number;
  text: string;
  approval: PendingApproval | null;
  error: string | null;
}

const terminals: Partial<Record<string, RuntimePhase>> = {
  "run.completed": "completed",
  "run.failed": "failed",
  "run.cancelled": "cancelled",
};

export function openSessionView(sessionId: string): RuntimeSessionView {
  return { sessionId, phase: "idle", runId: null, lastSeq: 0, text: "", approval: null, error: null };
}

export function requestCancel(view: RuntimeSessionView): RuntimeSessionView {
  return { ...view, phase: reduceRuntime(view.phase, { type: "cancel-requested" }) };
}

function live(view: RuntimeSessionView, phase: RuntimePhase): RuntimePhase {
  return view.phase === "cancel-pending" ? "cancel-pending" : phase;
}

function field(payload: unknown, name: string): string {
  const value = payload && typeof payload === "object" ? (payload as Record<string, unknown>)[name] : undefined;
  return typeof value === "string" ? value : "";
}

/** Applies one emission. Events for another session and replayed sequence numbers are ignored. */
export function reduceSessionView(view: RuntimeSessionView, emission: RuntimeEmission): RuntimeSessionView {
  if (emission.sessionId !== view.sessionId) return view;
  if (emission.kind === "stream-error") return { ...view, phase: "disconnected", error: emission.code };
  const { event } = emission;
  if (event.seq <= view.lastSeq) return view;
  const next = { ...view, lastSeq: event.seq, error: null };
  const terminal = terminals[event.type];
  if (terminal) return { ...next, phase: terminal, runId: null, approval: null };
  switch (event.type) {
    case "run.accepted":
      return { ...next, phase: live(view, "accepted"), runId: event.runId, text: "" };
    case "message.delta":
      return { ...next, phase: live(view, "running"), text: view.text + field(event.payload, "text") };
    case "approval.required":
      return {
        ...next,
        phase: live(view, "waiting"),
        approval: {
          approvalId: field(event.payload, "approvalId"),
          actionDigest: field(event.payload, "actionDigest"),
          summary: field(event.payload, "summary"),
        },
      };
    case "approval.resolved":
      return { ...next, phase: live(view, "running"), approval: null };
    case "tool.started":
    case "tool.result":
      return { ...next, phase: live(view, "running") };
    default:
      return next;
  }
}

/** Main-process handlers send `[CODE] message`; Electron prefixes it with the invoke wrapper. */
export function parseIpcErrorCode(error: unknown): string | null {
  const message = error instanceof Error ? error.message : String(error);
  return message.match(/\[([A-Z_]+)\]/)?.[1] ?? null;
}
