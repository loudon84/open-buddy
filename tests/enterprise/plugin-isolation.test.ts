import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { negotiate } from "../../packages/runtime/openbuddy-plugin-sdk/src/enterprise-manifest.ts";
import { digest, PluginRegistry } from "../../services/enterprise-plugin-registry/src/catalog.ts";
import { PluginLifecycle } from "../../packages/runtime/openbuddy-plugin-host/src/installation-store.ts";
import { IsolatedUiHost } from "../../packages/runtime/openbuddy-plugin-host/src/isolated-ui-host.ts";
import { installBackend } from "../../services/enterprise-plugin-worker/src/broker.ts";
import { serializePiTrack, serializeSlotTrack } from "../../packages/runtime/openbuddy-plugin-host/src/openbuddy-plugin-manifest.ts";

describe("P3-07 plugin fixture chain", () => {
  it("installs an approved package and refuses a hostile surface and backend", () => {
    const accepted = negotiate([{
      id: "plugin.session.reader",
      version: "1.0.0",
      dependencies: [],
      permissions: ["plugin.session.read"],
      surfaces: ["renderer"],
      legacyAliases: ["customer.read"],
    }], true);
    expect(accepted[0]?.permissions).toEqual(["plugin.session.read"]);
    const bytes = "fixture-bytes";
    const release = new PluginRegistry().publish({
      tenantId: "tenant-a",
      bytes,
      declaredHash: digest(bytes),
      permissions: ["plugin.session.read"],
      approved: true,
      signer: "key-1",
      revokedKeys: [],
      entries: [{ name: "index.js", size: 12 }],
    });
    const life = new PluginLifecycle();
    life.apply({ version: "1.0.0", schema: 2, permissions: release.permissions, routes: ["panel"], tools: [], mcp: [], business: [] }, { minSchema: 2, allowed: ["plugin.session.read"] });
    const host = new IsolatedUiHost();
    host.mount({ viewRef: "view://fixture", tenantId: "tenant-a", uiGrant: true, backendGrant: false });
    expect(() => host.receive({ channel: "ipc" })).toThrow(/denied/);
    expect(() => installBackend({ capabilities: ["renderer"], runtime: { kind: "container", run: () => ({ ok: true }) } })).toThrow(/capability/);
    expect(serializePiTrack({ schema: "openbuddy.plugin.v1", id: "old", tracks: [{ kind: "pi", source: "./old.ts" }] })[0]?.trackKind).toBe("pi");
    expect(serializeSlotTrack({ schema: "openbuddy.plugin.v1", id: "old-slot", tracks: [{ kind: "slot", source: "./slot.tsx" }] })[0]?.trackKind).toBe("slot");
    const smoke = spawnSync(process.execPath, ["scripts/enterprise/plugin-smoke.mjs", "--profile=staging"], { encoding: "utf8" });
    expect(smoke.status).toBe(2);
  });
});
