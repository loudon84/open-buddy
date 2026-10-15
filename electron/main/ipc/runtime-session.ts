import type { BrowserWindow } from "electron";
import { enterpriseIdentityPort } from "../identity/enterprise-identity-port";
import { getRuntimeSessionService } from "../runtime/runtime-session-handle";
import { wrapIpcHandler } from "./_wrap";
import { recordValue, requiredString } from "./validation";

export function registerRuntimeSessionIpc(getWindow: () => BrowserWindow | null): void {
  const guard = <T>(fn: (event: { senderFrame?: unknown }, args: unknown) => Promise<T> | T) => {
    return async (event: { senderFrame?: unknown }, args: unknown) => {
      const win = getWindow();
      if (!win || event.senderFrame !== win.webContents.mainFrame) throw new Error("[FORBIDDEN] main frame only");
      return fn(event, args);
    };
  };
  wrapIpcHandler("runtime-session:create", guard(async (_event, args) => {
    const payload = recordValue(args, "runtime-session:create");
    const service = getRuntimeSessionService();
    if (!service) throw new Error("[UPSTREAM_UNAVAILABLE] remote runtime is not configured");
    return service.create({
      uiSessionId: requiredString(payload.uiSessionId, "uiSessionId"),
      runtimeId: requiredString(payload.runtimeId, "runtimeId"),
      workspaceId: typeof payload.workspaceId === "string" ? payload.workspaceId : undefined,
    });
  }));
  wrapIpcHandler("runtime-session:attach", guard(async (_event, args) => {
    const payload = recordValue(args, "runtime-session:attach");
    const service = getRuntimeSessionService();
    if (!service) throw new Error("[UPSTREAM_UNAVAILABLE] remote runtime is not configured");
    return service.attach(requiredString(payload.uiSessionId, "uiSessionId"));
  }));
  wrapIpcHandler("runtime-session:capabilities", guard(async () => {
    const port = enterpriseIdentityPort();
    return { epoch: port.current()?.epoch ?? 0, features: { liveStream: false } };
  }));
  wrapIpcHandler("runtime-session:decide", guard(async (_event, args) => {
    recordValue(args, "runtime-session:decide");
    throw new Error("[UNSUPPORTED_CAPABILITY] approval decisions are not negotiated");
  }));
}
