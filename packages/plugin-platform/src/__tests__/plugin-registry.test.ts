import { describe, expect, it } from "vitest";
import { assertPluginTransition, parsePluginManifest } from "../manifest";
import { PluginRegistry } from "../plugin-registry";

const crm = parsePluginManifest({
  id: "crm-plugin",
  version: "1.0",
  type: "enterprise",
  permissions: ["browser", "network"],
  capabilities: ["tool", "ui", "connector"],
});

describe("parsePluginManifest", () => {
  it("accepts the CRM manifest and rejects an unknown permission", () => {
    expect(crm.id).toBe("crm-plugin");
    expect(() => parsePluginManifest({ ...crm, permissions: ["shell"] })).toThrow(/unknown permission/);
  });
});

describe("PluginRegistry lifecycle", () => {
  it("rejects a duplicate install and an illegal jump to Running", () => {
    const registry = new PluginRegistry();
    registry.install(crm);
    expect(() => registry.install(crm)).toThrow(/duplicate/);
    expect(() => assertPluginTransition("Installed", "Running")).toThrow(/illegal/);
  });

  it("activates from Installed to Running and disables", () => {
    const registry = new PluginRegistry();
    registry.install(crm);
    registry.activate("crm-plugin");
    expect(registry.list()[0]?.phase).toBe("Running");
    expect(registry.listUi().map((entry) => entry.label)).toEqual(["CRM"]);
    expect(registry.listTools().map((tool) => tool.id)).toEqual(["crm.lookupCustomer"]);
    expect(registry.listConnectors().map((connector) => connector.id)).toEqual(["crm"]);
    registry.disable("crm-plugin");
    expect(registry.list()[0]?.phase).toBe("Disabled");
    expect(registry.listTools()).toEqual([]);
  });

  it("rejects activate after removal", () => {
    const registry = new PluginRegistry();
    registry.install(crm);
    registry.remove("crm-plugin");
    expect(() => registry.activate("crm-plugin")).toThrow(/removed/);
  });
});
