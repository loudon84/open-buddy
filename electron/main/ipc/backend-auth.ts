import type { BrowserWindow } from "electron";
import { backendAuth } from "../backend-auth/backend-auth-service";
import { sendSafe } from "../collaboration/send-safe";
import { wrapIpcHandler } from "./_wrap";

export const BACKEND_AUTH_EVENT_CHANNEL = "backend-auth://status";

/** Backend login session. Tokens stay in the main process. */
export function registerBackendAuthIpc(getWindow: () => BrowserWindow | null): void {
  backendAuth.setStatusListener((view) => sendSafe(getWindow(), BACKEND_AUTH_EVENT_CHANNEL, view));
  wrapIpcHandler("backend-auth:status", async () => backendAuth.status());
  wrapIpcHandler("backend-auth:origin-save", async (_event, origin: unknown) => backendAuth.saveOrigin(typeof origin === "string" ? origin : ""));
  wrapIpcHandler("backend-auth:login", async () => backendAuth.login());
  wrapIpcHandler("backend-auth:cancel", async () => backendAuth.cancel());
  wrapIpcHandler("backend-auth:refresh", async () => backendAuth.refresh());
  wrapIpcHandler("backend-auth:logout", async () => backendAuth.logout());
}
