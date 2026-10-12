import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

type Handler = (event: { type: string; payload: unknown }) => void;
const invoke = vi.fn();
const listeners: Handler[] = [];
vi.mock("@/lib/platform/electron-api", () => ({
  invoke: (...args: unknown[]) => invoke(...args),
  listen: async (_channel: string, handler: Handler) => {
    listeners.push(handler);
    return () => listeners.splice(listeners.indexOf(handler), 1);
  },
}));

import { EnterpriseRuntimeDock } from "../EnterpriseRuntimeDock";

const base = { tenantId: "t1", workspaceId: "w1", actorId: "a", sessionId: "gws_1", agentInstanceId: "inst-1", runtimeId: "r", eventId: "e", occurredAt: "", traceId: "" };
function emit(seq: number, type: string, runId: string | null, payload: unknown = {}) {
  act(() => {
    for (const listener of [...listeners]) {
      listener({ type: "openbuddy://enterprise-runtime", payload: { kind: "event", sessionId: "gws_1", event: { ...base, seq, type, runId, payload } } });
    }
  });
}

describe("EnterpriseRuntimeDock", () => {
  beforeEach(() => {
    invoke.mockReset();
    listeners.length = 0;
  });

  it("renders nothing when the gateway is not configured", async () => {
    invoke.mockResolvedValue({ enabled: false, connected: false, tenantId: null });
    const { container } = render(<EnterpriseRuntimeDock />);
    await waitFor(() => expect(invoke).toHaveBeenCalledWith("enterprise-runtime:status"));
    expect(container).toBeEmptyDOMElement();
  });

  it("connects, starts a session, streams, approves, and cancels through main IPC", async () => {
    invoke.mockImplementation(async (channel: string) => {
      switch (channel) {
        case "enterprise-runtime:status":
          return { enabled: true, connected: false, tenantId: null };
        case "enterprise-runtime:connect":
          return { enabled: true, connected: true, tenantId: "t1" };
        case "enterprise-runtime:create-session":
          return { sessionId: "gws_1" };
        case "enterprise-runtime:send":
          return { runId: "run-1" };
        case "enterprise-runtime:decide":
          throw new Error("Error invoking remote method 'enterprise-runtime:decide': Error: [CONFLICT] approval parameters changed");
        default:
          return { accepted: true, subscribed: true };
      }
    });
    render(<EnterpriseRuntimeDock />);
    fireEvent.click(await screen.findByRole("button", { name: "企业运行时" }));
    fireEvent.click(screen.getByRole("button", { name: "连接" }));
    await screen.findByText(/租户 t1/);

    fireEvent.change(screen.getByLabelText("Workspace"), { target: { value: "w1" } });
    fireEvent.change(screen.getByLabelText("Agent 实例"), { target: { value: "inst-1" } });
    fireEvent.click(screen.getByRole("button", { name: "开始会话" }));
    await waitFor(() => expect(invoke).toHaveBeenCalledWith("enterprise-runtime:subscribe", { sessionId: "gws_1", afterSeq: 0 }));
    expect(invoke).toHaveBeenCalledWith("enterprise-runtime:create-session", expect.objectContaining({ workspaceId: "w1", agentInstanceId: "inst-1" }));

    fireEvent.change(screen.getByLabelText("消息"), { target: { value: "update crm" } });
    fireEvent.click(screen.getByRole("button", { name: "发送" }));
    await waitFor(() => expect(invoke).toHaveBeenCalledWith("enterprise-runtime:send", expect.objectContaining({ sessionId: "gws_1", text: "update crm" })));

    emit(1, "run.accepted", "run-1");
    emit(2, "message.delta", "run-1", { text: "working" });
    emit(3, "approval.required", "run-1", { approvalId: "ap-1", actionDigest: "d1", summary: "write crm" });
    expect(screen.getByText("working")).toBeInTheDocument();
    expect(screen.getByText("write crm")).toBeInTheDocument();
    expect(document.querySelector('[data-phase="waiting"]')).not.toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "批准" }));
    await screen.findByText("审批已过期或内容已变更，请重新确认");
    expect(invoke).toHaveBeenCalledWith("enterprise-runtime:decide", expect.objectContaining({ approvalId: "ap-1", decision: "approve", actionDigest: "d1" }));

    emit(4, "approval.resolved", "run-1", { approvalId: "ap-1" });
    fireEvent.click(screen.getByRole("button", { name: "取消运行" }));
    expect(document.querySelector('[data-phase="cancel-pending"]')).not.toBeNull();
    await waitFor(() => expect(invoke).toHaveBeenCalledWith("enterprise-runtime:cancel", expect.objectContaining({ sessionId: "gws_1", runId: "run-1" })));
    emit(5, "run.cancelled", "run-1");
    expect(document.querySelector('[data-phase="cancelled"]')).not.toBeNull();

    act(() => {
      for (const listener of [...listeners]) {
        listener({ type: "openbuddy://enterprise-runtime", payload: { kind: "stream-error", sessionId: "gws_1", code: "UPSTREAM_UNAVAILABLE", message: "down", retryable: true } });
      }
    });
    fireEvent.click(screen.getByRole("button", { name: "重新连接事件流" }));
    await waitFor(() => expect(invoke).toHaveBeenCalledWith("enterprise-runtime:subscribe", { sessionId: "gws_1", afterSeq: 5 }));
  });
});
