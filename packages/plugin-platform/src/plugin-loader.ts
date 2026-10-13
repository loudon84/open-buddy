import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { parsePluginManifest, type PluginManifest } from "./manifest";

export const CRM_PLUGIN_PATH = "plugins/crm-plugin";

export function assertInstallPath(requested: string): void {
  const normalized = requested.replace(/\\/g, "/");
  if (path.isAbsolute(requested) || path.win32.isAbsolute(requested) || normalized.split("/").includes("..")) {
    throw new Error("plugin path is not allowed");
  }
  if (normalized !== CRM_PLUGIN_PATH) throw new Error("plugin path is not allowed");
}

export function loadPluginAt(root: string, requested: string): PluginManifest {
  assertInstallPath(requested);
  const file = path.join(root, "plugins", "crm-plugin", "plugin.json");
  if (!existsSync(file)) throw new Error("plugin.json is missing");
  const manifest = parsePluginManifest(JSON.parse(readFileSync(file, "utf8")) as unknown);
  if (manifest.id !== "crm-plugin") throw new Error("plugin id is not crm-plugin");
  return manifest;
}
