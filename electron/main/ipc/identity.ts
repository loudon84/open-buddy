import { identity } from "../identity/identity-service";
import { identityView } from "./identity-view";
import { wrapIpcHandler } from "./_wrap";

export { identityView } from "./identity-view";

export function registerIdentityIpc(): void {
  wrapIpcHandler("identity:context", async () => identityView(identity.current()));
  wrapIpcHandler("identity:refresh", async () => {
    const result = await identity.refresh();
    if (!result.ok) return result;
    return { ok: true as const, context: identityView(result.context) };
  });
}
