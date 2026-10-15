import type { BrowserWindow, IpcMainInvokeEvent } from "electron";
import { enterpriseIdentityPort } from "../identity/enterprise-identity-port";
import { sendSafe } from "../collaboration/send-safe";
import { EnterpriseRuntimeController, resolveGatewayEndpoint } from "../runtime/enterprise-runtime-controller";
import { RemoteRuntimeError } from "../runtime/remote-hermes-adapter";
import { wrapIpcHandler } from "./_wrap";
import { enumValue, optionalFiniteInteger, optionalString, recordValue, requiredString, stringValue } from "./validation";

export const ENTERPRISE_RUNTIME_EVENT_CHANNEL = "openbuddy://enterprise-runtime";

function signedInIdentity(): { tenantId: string; actorId: string } | null {
  const snapshot = enterpriseIdentityPort().current();
  if (!snapshot) return null;
  return { tenantId: snapshot.tenantId, actorId: snapshot.subject };
}

async function freshToken(): Promise<string> {
  try {
    return await enterpriseIdentityPort().getAccessToken();
  } catch (error) {
    const message = error instanceof Error ? error.message : "signed out";
    throw new RemoteRuntimeError("UNAUTHENTICATED", message, false, "desktop-main", 401);
  }
}

/**
 * Enterprise remote runtime over the Hermes gateway. Off unless OPENBUDDY_ENTERPRISE_GATEWAY_URL
 * is an https URL (or loopback http). The access token stays in main.
 * Electron passes only the error message to the renderer, so the code travels as a `[CODE]` prefix.
 */
export function registerEnterpriseRuntimeIpc(getWindow: () => BrowserWindow | null): EnterpriseRuntimeController {
  const controller = new EnterpriseRuntimeController({
    endpoint: resolveGatewayEndpoint(process.env.OPENBUDDY_ENTERPRISE_GATEWAY_URL),
    identity: signedInIdentity,
    tokens: {
      getAccessToken: () => freshToken(),
      refresh: freshToken,
    },
    emit: (item) => sendSafe(getWindow(), ENTERPRISE_RUNTIME_EVENT_CHANNEL, item),
  });
  enterpriseIdentityPort().onChange((change) => {
    if (change.reason === "logout" || change.reason === "tenant-switch" || change.reason === "issuer-change" || change.reason === "session-invalidated") {
      void controller.dispose();
    }
  });

  const guarded =
    <T>(fn: (args: Record<string, unknown>) => Promise<T> | T) =>
    async (event: IpcMainInvokeEvent, args: unknown): Promise<T> => {
      if (event.senderFrame !== getWindow()?.webContents.mainFrame) throw new Error("[FORBIDDEN] main frame only");
      try {
        return await fn(args === undefined ? {} : recordValue(args, "payload"));
      } catch (error) {
        if (error instanceof RemoteRuntimeError) throw new Error(`[${error.code}] ${error.message}`);
        throw error;
      }
    };

  wrapIpcHandler("enterprise-runtime:status", guarded(() => controller.status()));
  wrapIpcHandler("enterprise-runtime:connect", guarded(() => controller.connect()));
  wrapIpcHandler(
    "enterprise-runtime:create-session",
    guarded((args) =>
      controller.createSession({
        agentInstanceId: requiredString(args.agentInstanceId, "agentInstanceId"),
        workspaceId: requiredString(args.workspaceId, "workspaceId"),
        requestId: optionalString(args.requestId, "requestId"),
      }),
    ),
  );
  wrapIpcHandler(
    "enterprise-runtime:send",
    guarded((args) => {
      const text = stringValue(args.text, "text");
      if (!text.trim() || text.length > 100_000) throw new Error("text must be 1 to 100000 characters");
      return controller.send({
        sessionId: requiredString(args.sessionId, "sessionId"),
        text,
        requestId: optionalString(args.requestId, "requestId"),
      });
    }),
  );
  wrapIpcHandler(
    "enterprise-runtime:cancel",
    guarded((args) =>
      controller.cancel({
        sessionId: requiredString(args.sessionId, "sessionId"),
        runId: requiredString(args.runId, "runId"),
        requestId: optionalString(args.requestId, "requestId"),
      }),
    ),
  );
  wrapIpcHandler(
    "enterprise-runtime:decide",
    guarded((args) =>
      controller.decide({
        sessionId: requiredString(args.sessionId, "sessionId"),
        approvalId: requiredString(args.approvalId, "approvalId"),
        decision: enumValue(args.decision, "decision", ["approve", "reject"] as const),
        actionDigest: requiredString(args.actionDigest, "actionDigest"),
        requestId: optionalString(args.requestId, "requestId"),
      }),
    ),
  );
  wrapIpcHandler(
    "enterprise-runtime:subscribe",
    guarded((args) => {
      controller.subscribe({
        sessionId: requiredString(args.sessionId, "sessionId"),
        afterSeq: optionalFiniteInteger(args.afterSeq, "afterSeq", 0, 0, Number.MAX_SAFE_INTEGER),
      });
      return { subscribed: true };
    }),
  );
  wrapIpcHandler(
    "enterprise-runtime:unsubscribe",
    guarded((args) => {
      controller.unsubscribe(requiredString(args.sessionId, "sessionId"));
      return { subscribed: false };
    }),
  );
  return controller;
}
