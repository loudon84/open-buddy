import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { IsolatedUiHost } from "../../packages/runtime/openbuddy-plugin-host/src/isolated-ui-host";
import { serializeSlotTrack } from "../../packages/runtime/openbuddy-plugin-host/src/openbuddy-plugin-manifest";
import { PluginSurface } from "../../packages/ui/openbuddy-ui-enterprise/src/plugin-surface";

describe("P3-03 isolated plugin surface", () => {
  it("drops host access, clears the old scope, and keeps the trusted slot serializer", () => {
    const host = new IsolatedUiHost();
    const mounted = host.mount({ viewRef: "view://third-party", tenantId: "tenant-a", uiGrant: true, backendGrant: false });
    expect(mounted.sandbox).toBe("allow-scripts");
    expect(() => host.receive({ type: "node", node: true })).toThrow(/denied/);
    expect(() => host.receive({ channel: "ipc" })).toThrow(/denied/);
    expect(() => host.receive({ type: "notify", secret: "tok" })).toThrow(/denied/);
    expect(host.receive({ type: "notify" })).toEqual({ type: "notify" });
    host.changeScope("tenant-b");
    expect(host.menus).toEqual([]);
    expect(host.subscriptions).toEqual([]);
    host.mount({ viewRef: "view://third-party", tenantId: "tenant-b", uiGrant: true, backendGrant: false });
    host.disable();
    expect(host.menus).toEqual([]);
    expect(host.subscriptions).toEqual([]);
    const html = renderToStaticMarkup(createElement(PluginSurface, mounted));
    expect(html).toContain("about:blank");
    expect(html).not.toContain("view://third-party.js");
    const source = readFileSync(resolve("packages/ui/openbuddy-ui-enterprise/src/plugin-surface.tsx"), "utf8");
    expect(source).not.toContain("import(");
    expect(serializeSlotTrack({
      schema: "openbuddy.plugin.v1",
      id: "sample",
      tracks: [{ kind: "slot", source: "./panel.tsx" }],
    })).toEqual([{ id: "sample", source: "./panel.tsx", trackKind: "slot" }]);
  });
});
