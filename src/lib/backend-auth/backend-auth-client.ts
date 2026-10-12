import { invoke } from "@/lib/platform/electron-api";

export type BackendAuthView = {
  status: "signed_out" | "signed_in" | "error";
  origin: string;
  displayName?: string;
  needsOrgSetup: boolean;
  mustChangePassword: boolean;
  phase: "idle" | "waiting_browser" | "exchanging";
  error?: string;
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

export const ORG_SETUP_NOTICE = "请到业务门户完成组织设置。";
export const PASSWORD_NOTICE = "请到业务门户修改密码。";

export function portalNotices(view: Pick<BackendAuthView, "needsOrgSetup" | "mustChangePassword"> | null): string[] {
  if (!view) return [];
  const lines: string[] = [];
  if (view.needsOrgSetup) lines.push(ORG_SETUP_NOTICE);
  if (view.mustChangePassword) lines.push(PASSWORD_NOTICE);
  return lines;
}
