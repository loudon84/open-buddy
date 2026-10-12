import { useEffect, useState } from "react";
import { backendAuthSaveOrigin, backendAuthStatus } from "@/lib/backend-auth/backend-auth-client";

/** Settings section for the backend origin shared with the sign-in dialog. */
export function EnterpriseLoginPanel() {
  const [value, setValue] = useState("");
  const [error, setError] = useState("");

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

  return (
    <section>
      <h2>企业登录</h2>
      <label>
        backend 根地址
        <input
          data-testid="enterprise-login-origin"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onBlur={() => { void commit(); }}
        />
      </label>
      {error ? <p role="alert">{error}</p> : null}
    </section>
  );
}
