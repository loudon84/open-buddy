import { useEffect, useState } from "react";
import { backendAuthSaveOrigin, backendAuthStatus, backendAuthTestConnection } from "@/lib/backend-auth/backend-auth-client";

/** Settings section for the enterprise identity gateway origin. */
export function EnterpriseLoginPanel() {
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const [probe, setProbe] = useState("");

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
      {error ? <p role="alert">{error}</p> : null}
      {probe ? <p data-testid="enterprise-login-probe">{probe}</p> : null}
    </section>
  );
}
