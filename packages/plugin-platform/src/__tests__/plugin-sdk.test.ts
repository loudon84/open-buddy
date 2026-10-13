import { describe, expect, it } from "vitest";
import { parsePluginManifest } from "../manifest";
import { PluginRegistry } from "../plugin-registry";

const crm = parsePluginManifest({
  id: "crm-plugin",
  version: "1.0",
  type: "enterprise",
  permissions: ["browser", "network"],
  capabilities: ["tool", "ui", "connector", "command", "mcp"],
});

describe("PluginSdk permission gate", () => {
  it("registers CRM contributions and blocks an undeclared credential", () => {
    const registry = new PluginRegistry();
    registry.install(crm);
    registry.load("crm-plugin");
    registry.activate("crm-plugin");
    const sdk = registry.sdk("crm-plugin");
    expect(() => sdk.registerTool({ id: "crm.secret", title: "密钥", permission: "credential" })).toThrow(/credential/);
    expect(registry.listTools().map((tool) => tool.id)).toContain("crm.lookupCustomer");
    sdk.registerCommand({ id: "crm.open", title: "打开 CRM" });
    sdk.registerMCP({ id: "crm-mcp", title: "CRM MCP" });
  });

  it("does not keep a tool when the capability is missing", () => {
    const registry = new PluginRegistry();
    registry.install(parsePluginManifest({
      id: "crm-plugin",
      version: "1.0",
      type: "enterprise",
      permissions: ["network"],
      capabilities: ["ui"],
    }));
    registry.activate("crm-plugin");
    expect(() => registry.sdk("crm-plugin").registerTool({ id: "crm.lookupCustomer", title: "查询客户" })).toThrow(/missing capability tool/);
    expect(registry.listTools()).toEqual([]);
  });
});
