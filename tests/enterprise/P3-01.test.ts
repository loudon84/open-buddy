import { describe, expect, it } from "vitest";
import { negotiate } from "../../packages/runtime/openbuddy-plugin-sdk/src/enterprise-manifest.ts";
import { serializePiTrack } from "../../packages/runtime/openbuddy-plugin-host/src/openbuddy-plugin-manifest.ts";

const base = {
  id: "plugin.session.reader",
  version: "1.2.3",
  dependencies: [] as string[],
  permissions: ["plugin.session.read"],
  surfaces: ["renderer"],
  legacyAliases: [] as string[],
};

describe("P3-01 enterprise manifest", () => {
  it("rejects broken packages and does not let a legacy alias grow a grant", () => {
    expect(negotiate([base], true)).toHaveLength(1);
    expect(() => negotiate([{ ...base, version: "1.2" }], true)).toThrow(/semver/);
    expect(() => negotiate([base, { ...base }], true)).toThrow(/duplicate id/);
    expect(() => negotiate([
      { ...base, id: "plugin.session.a", dependencies: ["plugin.session.b"] },
      { ...base, id: "plugin.session.b", dependencies: ["plugin.session.a"] },
    ], true)).toThrow(/cycle/);
    expect(() => negotiate([{ ...base, permissions: ["customer.read"] }], true)).toThrow(/unknown permission/);
    expect(() => negotiate([{ ...base, surfaces: ["remote-backend"] }], true)).toThrow(/unsupported surface/);
    expect(negotiate([{ ...base, legacyAliases: ["customer.read"] }], true)[0]?.permissions).toEqual(["plugin.session.read"]);

    const serialized = serializePiTrack({
      schema: "openbuddy.plugin.v1",
      id: "sample",
      tracks: [{ kind: "pi", source: "./index.ts" }],
    });
    expect(serialized).toEqual([{ id: "sample", source: "./index.ts", trackKind: "pi" }]);
  });
});
