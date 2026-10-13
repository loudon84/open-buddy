import { createMainLogger, withContext, type MainLogger } from "@openbuddy/logging-main";

let activeHostLogger: MainLogger | null = null;

export function createHostLogger(filePath: string): MainLogger {
  activeHostLogger = createMainLogger({
    filePath,
    serviceName: "openbuddy-agent-host",
    baseContext: { scope: "agent-host" },
  });
  return activeHostLogger;
}

function currentHostLogger(): MainLogger {
  activeHostLogger ??= createMainLogger({
    serviceName: "openbuddy-agent-host",
    baseContext: { scope: "agent-host" },
  });
  return activeHostLogger;
}

export function hostLog(logger: MainLogger, scope: string): MainLogger {
  return withContext(logger, { scope });
}

type IdentityLog = { userId?: string; tenantId?: string };

export function hostReceived(channel: string, traceId?: string, sessionId?: string, identity?: IdentityLog): void {
  hostLog(currentHostLogger(), "ipc-agent").info(
    { msg: "ipc.received", channel, traceId, sessionId, userId: identity?.userId, tenantId: identity?.tenantId },
    `${channel} received`,
  );
}

export function hostDispatched(channel: string, traceId?: string, sessionId?: string, identity?: IdentityLog): void {
  hostLog(currentHostLogger(), "ipc-agent").info(
    { msg: "ipc.dispatched", channel, traceId, sessionId, userId: identity?.userId, tenantId: identity?.tenantId },
    `${channel} dispatched`,
  );
}

export function hostFailed(channel: string, traceId?: string, error?: unknown, identity?: IdentityLog): void {
  hostLog(currentHostLogger(), "ipc-agent").error(
    {
      msg: "ipc.failed",
      channel,
      traceId,
      userId: identity?.userId,
      tenantId: identity?.tenantId,
      error: error instanceof Error ? { name: error.name, message: error.message } : String(error),
    },
    `${channel} failed`,
  );
}
