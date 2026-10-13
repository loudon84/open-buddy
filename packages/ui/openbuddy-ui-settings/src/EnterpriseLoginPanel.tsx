import { useEffect, useState } from "react";
import { backendAuthSaveOrigin, backendAuthStatus, backendAuthTestConnection } from "@/lib/backend-auth/backend-auth-client";
import { identityRefresh } from "@/lib/identity/identity-client";

/** Settings section for the enterprise identity gateway origin. */
export function EnterpriseLoginPanel() {
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const [probe, setProbe] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [refreshNote, setRefreshNote] = useState("");
  const [refreshError, setRefreshError] = useState("");

  useEffect(() => {
    void backendAuthStatus().then((view) => setValue(view.origin)).catch(() => undefined);
  }, []);

  async function commit(): Promise<void> {
    const saved = await backendAuthSaveOrigin(value);
    if (!saved.ok) {
      setError(saved.error);
      const current = await backendAuthStatus().catch(() => null);
      if (current) setValue(current.origin);
      return;
    }
    setError("");
    setValue(saved.origin);
  }

  async function refreshIdentity(): Promise<void> {
    setRefreshing(true);
    setRefreshNote("");
    setRefreshError("");
    try {
      const result = await identityRefresh();
      if (!result.ok) setRefreshError(result.error);
      else setRefreshNote("已刷新");
    } catch (error) {
      setRefreshError(error instanceof Error ? error.message : "身份上下文暂不可用，部分功能受限");
    } finally {
      setRefreshing(false);
    }
  }

  async function test(): Promise<void> {
    const result = await backendAuthTestConnection(value);
    setProbe(result.ok ? "连接成功" : result.error);
  }

  return (
    <section aria-label="企业登录">
      <h2>企业登录</h2>
      <label>
        Backend 服务地址
        <input
          data-testid="enterprise-login-origin"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          style={{ width: "28rem" }}
        />
      </label>
      <p>用于连接企业身份认证服务</p>
      <button type="button" data-testid="enterprise-login-save" onClick={() => { void commit(); }}>保存</button>
      <button type="button" data-testid="enterprise-login-test" onClick={() => { void test(); }}>测试连接</button>
      <button type="button" data-testid="enterprise-login-refresh" disabled={refreshing} onClick={() => { void refreshIdentity(); }}>
        {refreshing ? "刷新中…" : "刷新身份上下文"}
      </button>
      {error ? <p role="alert">{error}</p> : null}
      {refreshNote ? <p data-testid="enterprise-login-refresh-note">{refreshNote}</p> : null}
      {refreshError ? <p role="alert" data-testid="enterprise-login-refresh-error">{refreshError}</p> : null}
      {probe ? <p data-testid="enterprise-login-probe">{probe}</p> : null}
    </section>
  );
}
