export {
  assertPluginTransition,
  parsePluginManifest,
  type PluginCapability,
  type PluginManifest,
  type PluginPermission,
  type PluginPhase,
} from "./manifest";
export {
  PluginRegistry,
  type PluginCommand,
  type PluginConnector,
  type PluginListItem,
  type PluginMcp,
  type PluginSdk,
  type PluginTool,
  type PluginUiContribution,
} from "./plugin-registry";
export { assertInstallPath, CRM_PLUGIN_PATH, loadPluginAt } from "./plugin-loader";
