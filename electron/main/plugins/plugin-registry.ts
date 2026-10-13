import { PluginRegistry } from "../../../packages/plugin-platform/src/plugin-registry";

let current: PluginRegistry | null = null;

export function getPlatformPluginRegistry(): PluginRegistry {
  if (!current) current = new PluginRegistry();
  return current;
}

export function setPlatformPluginRegistry(registry: PluginRegistry | null): void {
  current = registry;
}
