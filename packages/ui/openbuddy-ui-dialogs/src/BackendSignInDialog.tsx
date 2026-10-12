import { useEffect, useState } from "react";
import {
  backendAuthCancel,
  backendAuthLogin,
  backendAuthSaveOrigin,
  backendAuthStatus,
  portalNotices,
  type BackendAuthView,
} from "@/lib/backend-auth/backend-auth-client";
import { listenSafe } from "@/lib/platform/electron-api";
import { ModalShell, ModalHead, ModalBody, ModalFooter } from "./ModalShell";

export interface BackendSignInDialogProps {
  open: boolean;
  onClose(): void;
  onSessionChange?(session: BackendAuthView | null): void;
  onToast?(message: string): void;
}

const EMPTY: BackendAuthView = {
  status: "signed_out",
  origin: "",
  needsOrgSetup: false,
  mustChangePassword: false,
  phase: "idle",
};

export function BackendSignInDialog({ open, onClose, onSessionChange }: BackendSignInDialogProps) {
  const [view, setView] = useState<BackendAuthView>(EMPTY);
  const [draft, setDraft] = useState("");
  const [fieldError, setFieldError] = useState("");

  useEffect(() => {
    if (!open) return;
    let disposed = false;
    void backendAuthStatus().then((next) => {
      if (disposed) return;
      setView(next);
      setDraft(next.origin);
      onSessionChange?.(next);
    }).catch(() => undefined);
    let unlisten: (() => void) | undefined;
    void listenSafe<BackendAuthView>("backend-auth://status", (event) => {
      if (disposed) return;
      setView(event.payload);
      onSessionChange?.(event.payload);
    }).then((cleanup) => {
      if (disposed) cleanup?.();
      else unlisten = cleanup ?? undefined;
    });
    return () => { disposed = true; unlisten?.(); };
  }, [open, onSessionChange]);

  if (!open) return null;

  const waiting = view.phase === "waiting_browser" || view.phase === "exchanging";
  const notices = view.status === "signed_in" ? portalNotices(view) : [];
  const showClose = view.status === "signed_in" && notices.length > 0 && !waiting;
  const disabled = !waiting && !showClose && draft.trim().length === 0;

  async function commitDraft(): Promise<boolean> {
    const saved = await backendAuthSaveOrigin(draft);
    if (!saved.ok) {
      setFieldError(saved.error);
      return false;
    }
    setFieldError("");
    setDraft(saved.origin);
    return true;
  }

  async function onPrimary(): Promise<void> {
    if (waiting) {
      const next = await backendAuthCancel();
      setView(next);
      onSessionChange?.(next);
      return;
    }
    if (showClose) {
      if (draft.trim() !== view.origin) {
        const ok = await commitDraft();
        if (!ok) return;
      }
      onClose();
      return;
    }
    const ok = await commitDraft();
    if (!ok) return;
    const started = await backendAuthLogin();
    if (!started.ok) setView((current) => ({ ...current, status: "error", error: started.error, phase: "idle" }));
  }

  async function closeDialog(): Promise<void> {
    if (waiting) await backendAuthCancel();
    else if (draft.trim() && draft.trim() !== view.origin) await commitDraft();
    onClose();
  }

  const label = waiting ? "取消" : showClose ? "关闭" : view.origin ? "登录" : "保存并登录";

  return (
    <ModalShell open onClose={() => { void closeDialog(); }} className="casdoor-signin" ariaLabel="企业登录">
      <ModalHead title="企业登录" onClose={() => { void closeDialog(); }} />
      <ModalBody>
        <label>
          backend 根地址
          <input
            data-testid="backend-signin-origin"
            value={draft}
            disabled={waiting}
            onChange={(event) => setDraft(event.target.value)}
            onBlur={() => { if (!waiting) void commitDraft(); }}
          />
        </label>
        {fieldError ? <p role="alert">{fieldError}</p> : null}
        {waiting ? <p role="status">请在系统浏览器中完成登录。</p> : null}
        {view.error ? <p role="alert" data-testid="backend-signin-error">{view.error}</p> : null}
        {notices.map((line) => <p key={line} role="status">{line}</p>)}
      </ModalBody>
      <ModalFooter>
        <button type="button" data-testid="backend-signin-primary" disabled={disabled} onClick={() => { void onPrimary(); }}>
          {label}
        </button>
      </ModalFooter>
    </ModalShell>
  );
}
