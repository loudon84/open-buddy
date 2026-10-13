import { casdoorAuth } from "../casdoor/casdoor-auth";
import { RemoteRuntimeError } from "../runtime/remote-hermes-adapter";
import { resolveGatewayEndpoint } from "../runtime/enterprise-runtime-controller";
import { snapshot } from "../runtime/runtime-health";
import { createPlatformRuntime } from "../runtime/runtime-registry";
import { wrapIpcHandler } from "./_wrap";
import { enumValue, recordValue } from "./validation";

const DEFAULT_HERMES_ENDPOINT = "http://127.0.0.1:8642";

async function freshToken(): Promise<string> {
  await casdoorAuth.refresh();
  const refreshed = casdoorAuth.getAccessToken();
  if (!refreshed) throw new RemoteRuntimeError("UNAUTHENTICATED", "signed out", false, "desktop-main", 401);
  return refreshed;
}

export function registerPlatformRuntimeIpc() {
  const endpoint = resolveGatewayEndpoint(process.env.OPENBUDDY_ENTERPRISE_GATEWAY_URL) ?? DEFAULT_HERMES_ENDPOINT;
  const manager = createPlatformRuntime({
    endpoint,
    tokens: {
      getAccessToken: async () => casdoorAuth.getAccessToken() ?? freshToken(),
      refresh: freshToken,
    },
  });

  wrapIpcHandler("platform-runtime:list", async () => manager.list());
  wrapIpcHandler("platform-runtime:health", async () => snapshot(manager.registry));
  wrapIpcHandler("platform-runtime:switch", async (_event, args) => {
    const payload = recordValue(args, "platform-runtime:switch");
    const id = enumValue(payload.id, "id", ["pi", "hermes"] as const);
    await manager.switchRuntime(id);
    return { ok: true as const, activeId: manager.activeId };
  });
  return manager;
}
