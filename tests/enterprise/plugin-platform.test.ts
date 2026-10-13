import { describe, expect, it } from "vitest";
import { loadPluginAt } from "../../packages/plugin-platform/src/plugin-loader";
import { PluginRegistry } from "../../packages/plugin-platform/src/plugin-registry";

describe("plugin platform acceptance", () => {
  it("installs the CRM plugin with sidebar, tool, and connector, then blocks credential use", () => {
    const registry = new PluginRegistry();
    const manifest = loadPluginAt(process.cwd(), "plugins/crm-plugin");
    registry.install(manifest);
    registry.activate(manifest.id);
    const [row] = registry.list();
    expect(row?.phase).toBe("Running");
    expect(row?.ui.map((entry) => entry.label)).toEqual(["CRM"]);
    expect(row?.tools.map((tool) => tool.id)).toEqual(["crm.lookupCustomer"]);
    expect(row?.connectors.map((connector) => connector.id)).toEqual(["crm"]);
    expect(() => registry.sdk("crm-plugin").registerTool({ id: "crm.secret", title: "密钥", permission: "credential" })).toThrow(/credential/);
    registry.disable("crm-plugin");
    expect(registry.listTools()).toEqual([]);
  });
});
