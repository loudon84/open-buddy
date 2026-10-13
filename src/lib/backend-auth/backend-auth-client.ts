import { invoke } from "@/lib/platform/electron-api";

export type BackendAuthView = {
  status: "signed_out" | "signed_in" | "error";
  origin: string;
  displayName?: string;
  needsOrgSetup: boolean;
  mustChangePassword: boolean;
  phase: "idle" | "waiting_browser" | "exchanging";
  error?: string;
  tenant?: { id: string; name: string };
  identityStale?: boolean;
};

export function backendAuthStatus(): Promise<BackendAuthView> {
  return invoke<BackendAuthView>("backend-auth:status");
}

export function backendAuthSaveOrigin(origin: string): Promise<{ ok: true; origin: string } | { ok: false; error: string }> {
  return invoke("backend-auth:origin-save", origin);
}

export function backendAuthLogin(): Promise<{ ok: true } | { ok: false; error: string }> {
  return invoke("backend-auth:login");
}

export function backendAuthCancel(): Promise<BackendAuthView> {
  return invoke("backend-auth:cancel");
}

export function backendAuthLogout(): Promise<BackendAuthView> {
  return invoke("backend-auth:logout");
}

export function backendAuthTestConnection(origin: string): Promise<{ ok: true } | { ok: false; error: string }> {
  return invoke("backend-auth:test-connection", origin);
}

export const ORG_SETUP_NOTICE = "请到业务门户完成组织设置。";
export const PASSWORD_NOTICE = "请到业务门户修改密码。";

export function portalNotices(view: Pick<BackendAuthView, "needsOrgSetup" | "mustChangePassword"> | null): string[] {
  if (!view) return [];
  const lines: string[] = [];
  if (view.needsOrgSetup) lines.push(ORG_SETUP_NOTICE);
  if (view.mustChangePassword) lines.push(PASSWORD_NOTICE);
  return lines;
}

/** Sidebar subtitle: tenant name, with a warning mark when the identity cache is stale. */
export function backendAccountNotice(view: BackendAuthView | null | undefined): string | undefined {
  if (!view || view.status !== "signed_in") return undefined;
  const tenant = view.tenant?.name ? `${view.identityStale ? "⚠ " : ""}${view.tenant.name}` : "";
  const text = [tenant, portalNotices(view).join("")].filter(Boolean).join(" ");
  return text || undefined;
}
