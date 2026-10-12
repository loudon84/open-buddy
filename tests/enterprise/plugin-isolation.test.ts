import { spawnSync } from "node:child_process";
import { generateKeyPairSync, sign } from "node:crypto";
import { describe, expect, it } from "vitest";
import { negotiate } from "../../packages/runtime/openbuddy-plugin-sdk/src/enterprise-manifest";
import { PluginRegistry, signingPayload } from "../../services/enterprise-plugin-registry/src/catalog";
import { PluginLifecycle } from "../../packages/runtime/openbuddy-plugin-host/src/installation-store";
import { IsolatedUiHost } from "../../packages/runtime/openbuddy-plugin-host/src/isolated-ui-host";
import { installBackend } from "../../services/enterprise-plugin-worker/src/broker";
import { serializePiTrack, serializeSlotTrack } from "../../packages/runtime/openbuddy-plugin-host/src/openbuddy-plugin-manifest";

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
    const keys = generateKeyPairSync("ed25519");
    const registry = new PluginRegistry({
      publisherKeys: new Map([["publisher-1", keys.publicKey]]),
      approvers: new Map([["tenant-a", new Set(["security-officer"])]]),
    });
    const manifest = { id: "plugin.session.reader", version: "1.0.0", permissions: ["plugin.session.read"] };
    const files = [{ name: "index.js", bytes: new TextEncoder().encode("fixture-bytes") }];
    const published = registry.publish({
      tenantId: "tenant-a",
      manifest,
      files,
      signature: { keyId: "publisher-1", value: sign(null, signingPayload(manifest, files), keys.privateKey).toString("base64") },
    });
    registry.approve(published.releaseId, { tenantId: "tenant-a", actorId: "security-officer" });
    const release = registry.install("tenant-a", published.releaseId);
    const life = new PluginLifecycle();
    life.apply({ version: "1.0.0", schema: 2, permissions: release.manifest.permissions, routes: ["panel"], tools: [], mcp: [], business: [] }, { minSchema: 2, allowed: ["plugin.session.read"] });
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
