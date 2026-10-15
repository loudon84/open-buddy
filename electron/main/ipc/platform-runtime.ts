import { normalizeRuntimeId } from "../../../packages/runtime/openbuddy-runtime-adapter/src/types";
import { enterpriseIdentityPort } from "../identity/enterprise-identity-port";
import { RemoteRuntimeError } from "../runtime/remote-hermes-adapter";
import { resolveGatewayEndpoint } from "../runtime/enterprise-runtime-controller";
import { snapshot } from "../runtime/runtime-health";
import { createPlatformRuntime } from "../runtime/runtime-registry";
import { wrapIpcHandler } from "./_wrap";
import { recordValue, requiredString } from "./validation";

let defaultRuntimeId = "local-pi";

export function getDefaultRuntimeId(): string {
  return defaultRuntimeId;
}

async function freshToken(): Promise<string> {
  try {
    return await enterpriseIdentityPort().getAccessToken();
  } catch (error) {
    const message = error instanceof Error ? error.message : "signed out";
    throw new RemoteRuntimeError("UNAUTHENTICATED", message, false, "desktop-main", 401);
  }
}

export function registerPlatformRuntimeIpc() {
  const endpoint = resolveGatewayEndpoint(process.env.OPENBUDDY_ENTERPRISE_GATEWAY_URL) ?? "";
  const manager = createPlatformRuntime({
    endpoint,
    tokens: {
      getAccessToken: async () => enterpriseIdentityPort().getAccessToken().catch(() => freshToken()),
      refresh: freshToken,
    },
  });

  wrapIpcHandler("platform-runtime:list", async () => manager.list());
  wrapIpcHandler("platform-runtime:health", async () => snapshot(manager.registry));
  wrapIpcHandler("platform-runtime:switch", async (_event, args) => {
    const payload = recordValue(args, "platform-runtime:switch");
    const requested = normalizeRuntimeId(requiredString(payload.id, "id"));
    const registryId = requested.startsWith("remote-hermes") ? "hermes" : "pi";
    await manager.switchRuntime(registryId);
    defaultRuntimeId = registryId === "pi" ? "local-pi" : requested;
    return { ok: true as const, activeId: manager.activeId, defaultRuntimeId };
  });
  return manager;
}
