export type PluginPermission = "filesystem" | "network" | "browser" | "credential" | "business-api";
export type PluginCapability = "tool" | "ui" | "connector" | "command" | "mcp";
export type PluginPhase = "Installed" | "Loaded" | "Activated" | "Running" | "Disabled" | "Removed";

export interface PluginManifest {
  id: string;
  version: string;
  type: "enterprise";
  permissions: PluginPermission[];
  capabilities: PluginCapability[];
}

const PERMISSIONS: readonly PluginPermission[] = ["filesystem", "network", "browser", "credential", "business-api"];
const CAPABILITIES: readonly PluginCapability[] = ["tool", "ui", "connector", "command", "mcp"];

const EDGES: Record<PluginPhase, readonly PluginPhase[]> = {
  Installed: ["Loaded", "Removed"],
  Loaded: ["Activated", "Removed"],
  Activated: ["Running", "Removed"],
  Running: ["Disabled", "Removed"],
  Disabled: ["Activated", "Removed"],
  Removed: [],
};

export function assertPluginTransition(from: PluginPhase, to: PluginPhase): void {
  if (!EDGES[from].includes(to)) throw new Error(`illegal plugin transition ${from} -> ${to}`);
}

export function parsePluginManifest(input: unknown): PluginManifest {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("manifest is invalid");
  const record = input as Record<string, unknown>;
  if (typeof record.id !== "string" || record.id.length === 0) throw new Error("plugin id is required");
  if (record.type !== "enterprise") throw new Error("plugin type must be enterprise");
  if (typeof record.version !== "string" || record.version.length === 0) throw new Error("plugin version is required");
  return {
    id: record.id,
    version: record.version,
    type: "enterprise",
    permissions: readList(record.permissions, PERMISSIONS, "permission"),
    capabilities: readList(record.capabilities, CAPABILITIES, "capability"),
  };
}

function readList<T extends string>(value: unknown, allowed: readonly T[], label: string): T[] {
  if (!Array.isArray(value)) throw new Error(`${label}s are required`);
  const items: T[] = [];
  for (const item of value) {
    if (typeof item !== "string" || !allowed.includes(item as T)) throw new Error(`unknown ${label} ${String(item)}`);
    if (items.includes(item as T)) throw new Error(`duplicate ${label} ${item}`);
    items.push(item as T);
  }
  return items;
}
