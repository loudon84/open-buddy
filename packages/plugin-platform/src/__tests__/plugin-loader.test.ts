import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { assertInstallPath, loadPluginAt } from "../plugin-loader";

describe("loadPluginAt", () => {
  it("rejects absolute paths and parent traversal", () => {
    expect(() => assertInstallPath("C:/plugins/crm-plugin")).toThrow(/not allowed/);
    expect(() => assertInstallPath("plugins/../crm-plugin")).toThrow(/not allowed/);
  });

  it("loads the CRM manifest and rejects a different id", () => {
    const root = mkdtempSync(path.join(tmpdir(), "plugin-platform-"));
    const dir = path.join(root, "plugins", "crm-plugin");
    mkdirSync(dir, { recursive: true });
    writeFileSync(path.join(dir, "plugin.json"), JSON.stringify({
      id: "other-plugin",
      version: "1.0",
      type: "enterprise",
      permissions: ["network"],
      capabilities: ["tool"],
    }));
    expect(() => loadPluginAt(root, "plugins/crm-plugin")).toThrow(/crm-plugin/);
    writeFileSync(path.join(dir, "plugin.json"), JSON.stringify({
      id: "crm-plugin",
      version: "1.0",
      type: "enterprise",
      permissions: ["browser", "network"],
      capabilities: ["tool", "ui", "connector"],
    }));
    expect(loadPluginAt(root, "plugins/crm-plugin").id).toBe("crm-plugin");
  });

  it("rejects a directory without plugin.json", () => {
    const root = mkdtempSync(path.join(tmpdir(), "plugin-platform-"));
    mkdirSync(path.join(root, "plugins", "crm-plugin"), { recursive: true });
    expect(() => loadPluginAt(root, "plugins/crm-plugin")).toThrow(/plugin.json/);
  });
});
