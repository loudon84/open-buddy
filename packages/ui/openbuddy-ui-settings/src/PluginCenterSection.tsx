import { useCallback, useEffect, useRef, useState } from "react";
import { invoke } from "@/lib/platform/electron-api";
import { getRendererPluginRuntime } from "@/lib/runtime/renderer-plugin-runtime";

export interface PlatformPluginRow {
  id: string;
  version: string;
  phase: string;
  tools: Array<{ id: string; title: string }>;
  connectors: Array<{ id: string; title: string }>;
  ui: Array<{ label: string }>;
}

export function publishCrmSidebar(register: (contribution: { kind: "sidebar"; id: string; payload: { label: string } }) => () => void): () => void {
  return register({ kind: "sidebar", id: "crm-plugin", payload: { label: "CRM" } });
}

export function PluginCenterSection() {
  const [rows, setRows] = useState<PlatformPluginRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const disposeRef = useRef<(() => void) | null>(null);

  const reload = useCallback(async () => {
    setRows(await invoke<PlatformPluginRow[]>("platform-plugin:list"));
  }, []);

  useEffect(() => {
    void reload().catch((cause: unknown) => setError(cause instanceof Error ? cause.message : String(cause)));
  }, [reload]);

  const crm = rows.find((row) => row.id === "crm-plugin");

  async function install() {
    setBusy(true);
    setError(null);
    try {
      await invoke("platform-plugin:install", { path: "plugins/crm-plugin" });
      await invoke("platform-plugin:activate", { id: "crm-plugin" });
      disposeRef.current?.();
      disposeRef.current = publishCrmSidebar((contribution) => getRendererPluginRuntime().contributions.register(contribution));
      await reload();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    setError(null);
    try {
      await invoke("platform-plugin:disable", { id: "crm-plugin" });
      disposeRef.current?.();
      disposeRef.current = null;
      await reload();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="plugin-center" aria-label="Plugin Center">
      <h3>Plugin Center</h3>
      {error && <p className="settings-msg settings-msg--warn">{error}</p>}
      <button type="button" data-testid="plugin-install-crm" disabled={busy || crm?.phase === "Running"} onClick={() => void install()}>
        安装 CRM
      </button>
      {crm ? (
        <article data-testid="plugin-row-crm">
          <h4>CRM</h4>
          <p>{crm.phase}</p>
          <p>{crm.ui.map((entry) => entry.label).join(", ")}</p>
          <p>{crm.tools.map((tool) => tool.id).join(", ")}</p>
          <p>{crm.connectors.map((connector) => connector.id).join(", ")}</p>
          <button type="button" data-testid="plugin-disable-crm" disabled={busy || crm.phase !== "Running"} onClick={() => void disable()}>
            停用
          </button>
        </article>
      ) : null}
    </section>
  );
}
