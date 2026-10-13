import { useCallback, useEffect, useState } from "react";
import { invoke } from "@/lib/platform/electron-api";

export interface RuntimeHealthRow {
  id: string;
  name: string;
  version: string;
  status: string;
  endpoint: string;
  capabilities: Array<{ id: string; name: string }>;
  active: boolean;
}

const UNSUPPORTED = [
  { id: "nanobot", name: "Nanobot" },
  { id: "qwenclaw", name: "QwenClaw" },
] as const;

export function AgentRuntimeSection() {
  const [rows, setRows] = useState<RuntimeHealthRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const health = await invoke<RuntimeHealthRow[]>("platform-runtime:health");
    setRows(health);
  }, []);

  useEffect(() => {
    void reload().catch((cause: unknown) => setError(cause instanceof Error ? cause.message : String(cause)));
  }, [reload]);

  async function switchTo(id: string) {
    setBusy(id);
    setError(null);
    try {
      await invoke("platform-runtime:switch", { id });
      await reload();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="agent-runtime" aria-label="Agent Runtime">
      <h3>Agent Runtime</h3>
      {error && <p className="settings-msg settings-msg--warn">{error}</p>}
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Version</th>
            <th>Status</th>
            <th>Endpoint</th>
            <th>Capabilities</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} data-active={row.active ? "true" : "false"}>
              <td>{row.name}{row.active ? " 当前" : ""}</td>
              <td>{row.version}</td>
              <td>{row.status}</td>
              <td>{row.endpoint}</td>
              <td>{row.capabilities.map((item) => item.name).join(", ")}</td>
              <td>
                <button type="button" data-testid={`runtime-switch-${row.id}`} disabled={row.active || busy !== null} onClick={() => void switchTo(row.id)}>
                  切换
                </button>
              </td>
            </tr>
          ))}
          {UNSUPPORTED.map((row) => (
            <tr key={row.id}>
              <td>{row.name}</td>
              <td />
              <td>unsupported</td>
              <td />
              <td />
              <td>
                <button type="button" data-testid={`runtime-switch-${row.id}`} disabled>
                  切换
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
