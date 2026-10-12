import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { reduceRuntime, RuntimePanel } from "../../packages/ui/openbuddy-ui-enterprise/src/runtime-panel";
import {
  openSessionView,
  parseIpcErrorCode,
  reduceSessionView,
  requestCancel,
} from "../../packages/ui/openbuddy-ui-enterprise/src/runtime-session";
import { runtimeShellState } from "../../electron/main/runtime/runtime-coordinator";
import type { EventType, RuntimeEmission } from "../../packages/runtime/openbuddy-runtime-adapter/src/types";

describe("P1-06 runtime panel", () => {
  it("distinguishes phases, waits for cancel, and does not fetch Hermes", () => {
    for (const phase of ["accepted", "running", "waiting", "completed"] as const) {
      const html = renderToStaticMarkup(createElement(RuntimePanel, { phase }));
      expect(html).toContain(`data-phase="${phase}"`);
    }
    const pending = reduceRuntime("running", { type: "cancel-requested" });
    expect(pending).toBe("cancel-pending");
    expect(reduceRuntime(pending, { type: "terminal", status: "cancelled" })).toBe("cancelled");
    expect(reduceRuntime("running", { type: "disconnected" })).toBe("disconnected");
    const source = readFileSync(resolve("packages/ui/openbuddy-ui-enterprise/src/runtime-panel.tsx"), "utf8");
    expect(source).not.toContain("fetch(");
    const view = runtimeShellState("running", "endpoint-ref");
    expect(JSON.stringify(view)).not.toContain("token");
  });

  it("projects main-process emissions into the dock view with cancel and approval semantics", () => {
    const base = { tenantId: "t1", workspaceId: "w1", actorId: "a", sessionId: "s1", agentInstanceId: "i", runtimeId: "r", eventId: "e", occurredAt: "", traceId: "" };
    const event = (seq: number, type: EventType, runId: string | null, payload: unknown = {}): RuntimeEmission => ({
      kind: "event",
      sessionId: "s1",
      event: { ...base, seq, type, runId, payload },
    });
    let view = openSessionView("s1");
    expect(view.phase).toBe("idle");

    view = reduceSessionView(view, event(1, "run.accepted", "run-1"));
    view = reduceSessionView(view, event(2, "message.delta", "run-1", { text: "hel" }));
    view = reduceSessionView(view, event(2, "message.delta", "run-1", { text: "hel" }));
    view = reduceSessionView(view, event(3, "message.delta", "run-1", { text: "lo" }));
    expect(view).toMatchObject({ phase: "running", runId: "run-1", text: "hello", lastSeq: 3 });

    view = reduceSessionView(view, { kind: "event", sessionId: "other", event: { ...base, sessionId: "other", seq: 9, type: "run.failed", runId: "x", payload: {} } });
    expect(view.phase).toBe("running");

    view = reduceSessionView(view, event(4, "approval.required", "run-1", { approvalId: "ap-1", actionDigest: "d1", summary: "write crm" }));
    expect(view).toMatchObject({ phase: "waiting", approval: { approvalId: "ap-1", actionDigest: "d1", summary: "write crm" } });
    view = reduceSessionView(view, event(5, "approval.resolved", "run-1", { approvalId: "ap-1" }));
    expect(view).toMatchObject({ phase: "running", approval: null });

    view = requestCancel(view);
    expect(view.phase).toBe("cancel-pending");
    view = reduceSessionView(view, event(6, "message.delta", "run-1", { text: "!" }));
    expect(view.phase).toBe("cancel-pending");
    view = reduceSessionView(view, event(7, "run.cancelled", "run-1"));
    expect(view).toMatchObject({ phase: "cancelled", runId: null });

    view = reduceSessionView(view, { kind: "stream-error", sessionId: "s1", code: "UPSTREAM_UNAVAILABLE", message: "down", retryable: true });
    expect(view).toMatchObject({ phase: "disconnected", error: "UPSTREAM_UNAVAILABLE" });
    expect(parseIpcErrorCode(new Error("Error invoking remote method 'enterprise-runtime:decide': Error: [CONFLICT] approval parameters changed"))).toBe("CONFLICT");
    expect(parseIpcErrorCode(new Error("boom"))).toBeNull();

    const html = renderToStaticMarkup(createElement(RuntimePanel, { phase: "failed" }));
    expect(html).toContain('data-phase="failed"');
  });
});
