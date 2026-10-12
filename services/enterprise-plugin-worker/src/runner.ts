export interface ContainerProfile {
  user: string;
  readonlyRootfs: boolean;
  network: boolean;
  hostFs: boolean;
  secrets: string[];
  timeoutMs: number;
  cpuMillis: number;
  memoryMb: number;
}

export interface ContainerRuntime {
  kind: "container";
  run(profile: ContainerProfile): { ok: true };
}

export function installBackend(input: { capabilities: string[]; runtime: ContainerRuntime | null }): ContainerRuntime {
  if (!input.capabilities.includes("remote-backend")) throw new Error("backend capability missing");
  if (!input.runtime || input.runtime.kind !== "container") throw new Error("in-process execution refused");
  return input.runtime;
}

export function launch(profile: ContainerProfile, request: { path: string }, runtime: ContainerRuntime): { ok: true } {
  if (profile.user === "root" || !profile.readonlyRootfs || profile.network || profile.hostFs || profile.secrets.length > 0) {
    throw new Error("profile refused");
  }
  if (profile.timeoutMs <= 0 || profile.cpuMillis <= 0 || profile.memoryMb <= 0) throw new Error("limit refused");
  if (request.path.includes("..") || request.path.startsWith("/host") || request.path.includes("secret")) {
    throw new Error("escape refused");
  }
  return runtime.run(profile);
}
