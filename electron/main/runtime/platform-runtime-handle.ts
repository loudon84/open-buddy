import type { RuntimeManager } from "./runtime-manager";

let current: RuntimeManager | null = null;

export function getPlatformRuntimeManager(): RuntimeManager | null {
  return current;
}

export function setPlatformRuntimeManager(manager: RuntimeManager | null): void {
  current = manager;
}
