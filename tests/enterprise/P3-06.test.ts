import { describe, expect, it } from "vitest";
import { PluginLifecycle, type InstallSnapshot } from "../../packages/runtime/openbuddy-plugin-host/src/installation-store";

const policy = { minSchema: 2, allowed: ["plugin.session.read"] };
const v1: InstallSnapshot = { version: "1.0.0", schema: 2, permissions: ["plugin.session.read"], routes: ["home"], tools: ["read"], mcp: ["mcp"], business: ["notes"] };

describe("P3-06 plugin lifecycle", () => {
  it("keeps the old version when upgrade fails and does not delete business data", () => {
    const life = new PluginLifecycle();
    life.apply(v1, policy);
    expect(() => life.upgrade({ ...v1, version: "2.0.0", schema: 1 }, policy)).toThrow(/schema/);
    expect(life.status()).toMatchObject({ state: "enabled", version: "1.0.0", routes: ["home"] });
    life.revoked.add("plugin.tool.execute");
    expect(() => life.rollback({ ...v1, permissions: ["plugin.tool.execute"] }, { ...policy, allowed: ["plugin.tool.execute"] })).toThrow(/permission/);
    expect(life.status().version).toBe("1.0.0");
    life.disable();
    expect(life.status()).toMatchObject({ state: "disabled", routes: [] });
    expect(life.uninstall()).toEqual({ business: ["notes"] });
    expect(life.status().state).toBe("absent");
  });
});
