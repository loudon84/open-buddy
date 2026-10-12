export interface RuntimeSessionRef {
  sessionId: string;
  runtimeId: string;
}

export function readiness(input: { dbOk: boolean; upstreamOk: boolean }): { ready: boolean; reason: string } {
  if (!input.dbOk) return { ready: false, reason: "db" };
  if (!input.upstreamOk) return { ready: false, reason: "upstream" };
  return { ready: true, reason: "ok" };
}

export function assertDeploymentConfig(input: { tls: boolean; rateLimitPerMinute: number; secretRef: string }): void {
  if (!input.tls) throw new Error("tls is required");
  if (input.rateLimitPerMinute <= 0) throw new Error("rate limit is required");
  if (!input.secretRef.startsWith("secret://")) throw new Error("secret ref is required");
}

export function runtimeForNewSession(remoteEnabled: boolean): "local-pi" | "remote-hermes" {
  return remoteEnabled ? "remote-hermes" : "local-pi";
}

export function rollbackRemoteFlag(sessions: RuntimeSessionRef[], remoteEnabled: boolean): { sessions: RuntimeSessionRef[]; nextRuntime: "local-pi" | "remote-hermes" } {
  return {
    sessions: sessions.map((session) => ({ ...session })),
    nextRuntime: runtimeForNewSession(remoteEnabled),
  };
}
