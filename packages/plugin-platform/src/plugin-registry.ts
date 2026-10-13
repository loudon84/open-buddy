import {
  assertPluginTransition,
  type PluginCapability,
  type PluginManifest,
  type PluginPermission,
  type PluginPhase,
} from "./manifest";

export interface PluginTool {
  pluginId: string;
  id: string;
  title: string;
}

export interface PluginConnector {
  pluginId: string;
  id: string;
  title: string;
}

export interface PluginUiContribution {
  pluginId: string;
  surface: "sidebar";
  label: string;
}

export interface PluginCommand {
  pluginId: string;
  id: string;
  title: string;
}

export interface PluginMcp {
  pluginId: string;
  id: string;
  title: string;
}

export interface PluginListItem {
  id: string;
  version: string;
  phase: PluginPhase;
  tools: PluginTool[];
  connectors: PluginConnector[];
  ui: PluginUiContribution[];
}

export interface PluginSdk {
  registerTool(input: { id: string; title: string; permission?: PluginPermission }): void;
  registerCommand(input: { id: string; title: string }): void;
  registerUI(input: { surface: "sidebar"; label: string }): void;
  registerConnector(input: { id: string; title: string }): void;
  registerMCP(input: { id: string; title: string }): void;
}

const BUSINESS_PERMISSIONS: readonly PluginPermission[] = ["filesystem", "network", "browser", "credential", "business-api"];

export class PluginRegistry {
  private readonly manifests = new Map<string, PluginManifest>();
  private readonly phases = new Map<string, PluginPhase>();
  private readonly tools = new Map<string, PluginTool>();
  private readonly connectors = new Map<string, PluginConnector>();
  private readonly commands = new Map<string, PluginCommand>();
  private readonly mcps = new Map<string, PluginMcp>();
  private readonly ui = new Map<string, PluginUiContribution>();

  install(manifest: PluginManifest): void {
    if (this.manifests.has(manifest.id)) throw new Error(`duplicate plugin id ${manifest.id}`);
    this.manifests.set(manifest.id, manifest);
    this.phases.set(manifest.id, "Installed");
  }

  load(id: string): void {
    this.move(id, "Loaded");
  }

  activate(id: string): void {
    const phase = this.phaseOf(id);
    if (phase === "Removed") throw new Error("plugin is removed");
    if (phase === "Installed") this.move(id, "Loaded");
    if (this.phaseOf(id) === "Loaded" || this.phaseOf(id) === "Disabled") this.move(id, "Activated");
    if (this.phaseOf(id) !== "Activated" && this.phaseOf(id) !== "Running") {
      throw new Error(`illegal plugin transition ${phase} -> Activated`);
    }
    if (id === "crm-plugin") this.registerCrm(id);
    if (this.phaseOf(id) === "Activated") this.move(id, "Running");
  }

  disable(id: string): void {
    this.move(id, "Disabled");
  }

  remove(id: string): void {
    this.move(id, "Removed");
  }

  sdk(id: string): PluginSdk {
    return {
      registerTool: (input) => this.registerTool(id, input),
      registerCommand: (input) => this.registerCommand(id, input),
      registerUI: (input) => this.registerUI(id, input),
      registerConnector: (input) => this.registerConnector(id, input),
      registerMCP: (input) => this.registerMCP(id, input),
    };
  }

  list(): PluginListItem[] {
    return [...this.manifests.values()].map((manifest) => ({
      id: manifest.id,
      version: manifest.version,
      phase: this.phaseOf(manifest.id),
      tools: this.listTools().filter((tool) => tool.pluginId === manifest.id),
      connectors: this.listConnectors().filter((connector) => connector.pluginId === manifest.id),
      ui: this.listUi().filter((entry) => entry.pluginId === manifest.id),
    }));
  }

  listTools(): PluginTool[] {
    return this.visible([...this.tools.values()]);
  }

  listConnectors(): PluginConnector[] {
    return this.visible([...this.connectors.values()]);
  }

  listUi(): PluginUiContribution[] {
    return this.visible([...this.ui.values()]);
  }

  private registerCrm(id: string): void {
    const manifest = this.manifests.get(id);
    if (!manifest?.capabilities.includes("tool") || !manifest.capabilities.includes("ui") || !manifest.capabilities.includes("connector")) return;
    const sdk = this.sdk(id);
    sdk.registerUI({ surface: "sidebar", label: "CRM" });
    sdk.registerTool({ id: "crm.lookupCustomer", title: "查询客户" });
    sdk.registerConnector({ id: "crm", title: "CRM Connector" });
  }

  private registerTool(pluginId: string, input: { id: string; title: string; permission?: PluginPermission }): void {
    const manifest = this.writable(pluginId);
    this.requireCapability(manifest, "tool");
    if (input.permission) this.requirePermission(manifest, input.permission);
    else if (!manifest.permissions.some((permission) => BUSINESS_PERMISSIONS.includes(permission))) {
      throw new Error("permission is not declared");
    }
    this.tools.set(`${pluginId}:${input.id}`, { pluginId, id: input.id, title: input.title });
  }

  private registerCommand(pluginId: string, input: { id: string; title: string }): void {
    const manifest = this.writable(pluginId);
    this.requireCapability(manifest, "command");
    this.commands.set(`${pluginId}:${input.id}`, { pluginId, id: input.id, title: input.title });
  }

  private registerUI(pluginId: string, input: { surface: "sidebar"; label: string }): void {
    const manifest = this.writable(pluginId);
    this.requireCapability(manifest, "ui");
    if (input.surface !== "sidebar") throw new Error("ui surface is not allowed");
    this.ui.set(pluginId, { pluginId, surface: "sidebar", label: input.label });
  }

  private registerConnector(pluginId: string, input: { id: string; title: string }): void {
    const manifest = this.writable(pluginId);
    this.requireCapability(manifest, "connector");
    this.requirePermission(manifest, "network");
    this.connectors.set(`${pluginId}:${input.id}`, { pluginId, id: input.id, title: input.title });
  }

  private registerMCP(pluginId: string, input: { id: string; title: string }): void {
    const manifest = this.writable(pluginId);
    this.requireCapability(manifest, "mcp");
    this.requirePermission(manifest, "network");
    this.mcps.set(`${pluginId}:${input.id}`, { pluginId, id: input.id, title: input.title });
  }

  private writable(id: string): PluginManifest {
    const phase = this.phaseOf(id);
    if (phase !== "Activated" && phase !== "Running") throw new Error(`plugin ${id} cannot register while ${phase}`);
    return this.manifests.get(id)!;
  }

  private requireCapability(manifest: PluginManifest, capability: PluginCapability): void {
    if (!manifest.capabilities.includes(capability)) throw new Error(`missing capability ${capability}`);
  }

  private requirePermission(manifest: PluginManifest, permission: PluginPermission): void {
    if (!manifest.permissions.includes(permission)) throw new Error(`permission ${permission} is not declared`);
  }

  private visible<T extends { pluginId: string }>(items: T[]): T[] {
    return items.filter((item) => this.phaseOf(item.pluginId) === "Running");
  }

  private phaseOf(id: string): PluginPhase {
    const phase = this.phases.get(id);
    if (!phase || !this.manifests.has(id)) throw new Error(`unknown plugin id ${id}`);
    return phase;
  }

  private move(id: string, to: PluginPhase): void {
    const from = this.phaseOf(id);
    assertPluginTransition(from, to);
    this.phases.set(id, to);
  }
}
