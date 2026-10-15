import type { RuntimeSessionService } from "./runtime-session-service";

let current: RuntimeSessionService | null = null;

export function getRuntimeSessionService(): RuntimeSessionService | null {
  return current;
}

export function setRuntimeSessionService(service: RuntimeSessionService | null): void {
  current = service;
}
