import { BrowserWindow } from "electron";
import { identity } from "../identity/identity-service";
import { identityMode } from "../identity/identity-mode";
import { enterpriseIdentityPort } from "../identity/enterprise-identity-port";
import { identityView } from "./identity-view";
import { wrapIpcHandler } from "./_wrap";

export { identityView } from "./identity-view";

export function registerIdentityIpc(): void {
  enterpriseIdentityPort().onChange(() => {
    const view = identityView(identity.current());
    for (const win of BrowserWindow.getAllWindows()) {
      if (!win.isDestroyed()) win.webContents.send("identity://changed", view);
    }
  });
  wrapIpcHandler("identity:mode", async () => ({ mode: identityMode() }));
  wrapIpcHandler("identity:context", async () => identityView(identity.current()));
  wrapIpcHandler("identity:refresh", async () => {
    const result = await identity.refresh();
    if (!result.ok) return result;
    return { ok: true as const, context: identityView(result.context) };
  });
}
