/**
 * Enterprise remote runtime dock (P1-06).
 *
 * Renders nothing unless main reports a configured gateway (OPENBUDDY_ENTERPRISE_GATEWAY_URL), so the
 * local Pi shell is unchanged by default. Every call goes through `enterprise-runtime:*` IPC; the
 * access token, tenant, and actor stay in main.
 */
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { invoke, listen } from "@/lib/platform/electron-api";
import type { RuntimeEmission } from "../../../packages/runtime/openbuddy-runtime-adapter/src/types";
import { RuntimePanel } from "../../../packages/ui/openbuddy-ui-enterprise/src/runtime-panel";
import {
  openSessionView,
  parseIpcErrorCode,
  reduceSessionView,
  requestCancel,
  type RuntimeSessionView,
} from "../../../packages/ui/openbuddy-ui-enterprise/src/runtime-session";
import styles from "./EnterpriseRuntimeDock.module.css";

interface RuntimeStatus {
  enabled: boolean;
  connected: boolean;
  tenantId: string | null;
}

const EVENT_CHANNEL = "openbuddy://enterprise-runtime";

const errorText: Record<string, string> = {
  UNAUTHENTICATED: "请先登录企业账号",
  FORBIDDEN: "当前角色无权执行此操作",
  NOT_FOUND: "会话不存在，或已切换租户",
  CONFLICT: "审批已过期或内容已变更，请重新确认",
  UNSUPPORTED_CAPABILITY: "该 Agent 实例不支持此操作",
  UPSTREAM_UNAVAILABLE: "企业网关暂不可用",
  RATE_LIMITED: "请求过于频繁，请稍后再试",
  TIMEOUT: "请求超时",
};

function describeError(error: unknown): string {
  const code = parseIpcErrorCode(error);
  return (code && errorText[code]) ?? "请求失败";
}

export function EnterpriseRuntimeDock(): JSX.Element | null {
  const [status, setStatus] = useState<RuntimeStatus | null>(null);
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<RuntimeSessionView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [workspaceId, setWorkspaceId] = useState("");
  const [agentInstanceId, setAgentInstanceId] = useState("");
  const [draft, setDraft] = useState("");
  const sessionRef = useRef<string | null>(null);

  useEffect(() => {
    let active = true;
    invoke<RuntimeStatus>("enterprise-runtime:status")
      .then((next) => active && setStatus(next))
      .catch(() => active && setStatus(null));
    return () => {
      active = false;
    };
  }, []);

  const enabled = status?.enabled === true;
  useEffect(() => {
    if (!enabled) return;
    let active = true;
    let unlisten: (() => void) | undefined;
    void listen<RuntimeEmission>(EVENT_CHANNEL, ({ payload }) => {
      setView((current) => (current ? reduceSessionView(current, payload) : current));
    }).then((stop) => {
      if (active) unlisten = stop;
      else stop();
    });
    return () => {
      active = false;
      unlisten?.();
      if (sessionRef.current) void invoke("enterprise-runtime:unsubscribe", { sessionId: sessionRef.current }).catch(() => {});
    };
  }, [enabled]);

  const run = useCallback(async (action: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (failure) {
      setError(describeError(failure));
    } finally {
      setBusy(false);
    }
  }, []);

  if (!enabled) return null;

  const connect = () =>
    run(async () => {
      setStatus(await invoke<RuntimeStatus>("enterprise-runtime:connect"));
    });

  const startSession = (event: FormEvent) => {
    event.preventDefault();
    void run(async () => {
      const { sessionId } = await invoke<{ sessionId: string }>("enterprise-runtime:create-session", {
        workspaceId: workspaceId.trim(),
        agentInstanceId: agentInstanceId.trim(),
        requestId: crypto.randomUUID(),
      });
      sessionRef.current = sessionId;
      setView(openSessionView(sessionId));
      await invoke("enterprise-runtime:subscribe", { sessionId, afterSeq: 0 });
    });
  };

  const send = (event: FormEvent) => {
    event.preventDefault();
    if (!view || !draft.trim()) return;
    const text = draft;
    void run(async () => {
      await invoke("enterprise-runtime:send", { sessionId: view.sessionId, text, requestId: crypto.randomUUID() });
      setDraft("");
    });
  };

  const decide = (decision: "approve" | "reject") => {
    if (!view?.approval) return;
    const { approvalId, actionDigest } = view.approval;
    void run(async () => {
      await invoke("enterprise-runtime:decide", {
        sessionId: view.sessionId,
        approvalId,
        decision,
        actionDigest,
        requestId: crypto.randomUUID(),
      });
    });
  };

  const cancel = () => {
    if (!view?.runId) return;
    const { sessionId, runId } = view;
    setView(requestCancel(view));
    void run(async () => {
      await invoke("enterprise-runtime:cancel", { sessionId, runId, requestId: crypto.randomUUID() });
    });
  };

  const resubscribe = () => {
    if (!view) return;
    const { sessionId, lastSeq } = view;
    void run(async () => {
      await invoke("enterprise-runtime:subscribe", { sessionId, afterSeq: lastSeq });
    });
  };

  const live = view && ["accepted", "running", "waiting"].includes(view.phase);

  return (
    <div className={styles.dock} data-slot="enterprise-runtime-dock">
      <button type="button" className={styles.toggle} aria-expanded={open} onClick={() => setOpen(!open)}>
        企业运行时
      </button>
      {open && (
        <section className={styles.panel} aria-label="企业运行时">
          {!status.connected ? (
            <button type="button" disabled={busy} onClick={connect}>
              连接
            </button>
          ) : (
            <p className={styles.meta}>租户 {status.tenantId}</p>
          )}
          {status.connected && !view && (
            <form className={styles.form} onSubmit={startSession}>
              <label>
                Workspace
                <input value={workspaceId} onChange={(event) => setWorkspaceId(event.target.value)} required />
              </label>
              <label>
                Agent 实例
                <input value={agentInstanceId} onChange={(event) => setAgentInstanceId(event.target.value)} required />
              </label>
              <button type="submit" disabled={busy}>
                开始会话
              </button>
            </form>
          )}
          {view && (
            <>
              <RuntimePanel phase={view.phase} />
              {view.text && <pre className={styles.output}>{view.text}</pre>}
              {view.approval && (
                <div className={styles.approval} role="alertdialog" aria-label="审批">
                  <p>{view.approval.summary}</p>
                  <button type="button" disabled={busy} onClick={() => decide("approve")}>
                    批准
                  </button>
                  <button type="button" disabled={busy} onClick={() => decide("reject")}>
                    拒绝
                  </button>
                </div>
              )}
              {live && (
                <button type="button" onClick={cancel} disabled={!view.runId}>
                  取消运行
                </button>
              )}
              {view.phase === "disconnected" && (
                <button type="button" disabled={busy} onClick={resubscribe}>
                  重新连接事件流
                </button>
              )}
              <form className={styles.form} onSubmit={send}>
                <label>
                  消息
                  <textarea value={draft} onChange={(event) => setDraft(event.target.value)} rows={3} />
                </label>
                <button type="submit" disabled={busy || !draft.trim() || Boolean(live)}>
                  发送
                </button>
              </form>
            </>
          )}
          {error && (
            <p className={styles.error} role="alert">
              {error}
            </p>
          )}
        </section>
      )}
    </div>
  );
}
