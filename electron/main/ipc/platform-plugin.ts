import { app } from "electron";
import { loadPluginAt } from "../plugins/plugin-loader";
import { getPlatformPluginRegistry } from "../plugins/plugin-registry";
import { wrapIpcHandler } from "./_wrap";
import { recordValue, requiredString } from "./validation";

export function registerPlatformPluginIpc(): void {
  const registry = getPlatformPluginRegistry();
  wrapIpcHandler("platform-plugin:list", async () => registry.list());
  wrapIpcHandler("platform-plugin:install", async (_event, args) => {
    const payload = recordValue(args, "platform-plugin:install");
    const manifest = loadPluginAt(app.getAppPath(), requiredString(payload.path, "path"));
    registry.install(manifest);
    return { ok: true as const, id: manifest.id };
  });
  wrapIpcHandler("platform-plugin:activate", async (_event, args) => {
    const payload = recordValue(args, "platform-plugin:activate");
    const id = requiredString(payload.id, "id");
    registry.activate(id);
    return { ok: true as const, phase: registry.list().find((item) => item.id === id)?.phase };
  });
  wrapIpcHandler("platform-plugin:disable", async (_event, args) => {
    const payload = recordValue(args, "platform-plugin:disable");
    registry.disable(requiredString(payload.id, "id"));
    return { ok: true as const };
  });
}
