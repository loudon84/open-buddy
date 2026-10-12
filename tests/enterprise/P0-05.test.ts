import { describe, expect, it } from "vitest";
import { checkWorkspacePluginContract } from "../../scripts/architecture/check-workspace-plugin-contract.mjs";

describe("P0-05 workspace and plugin contract", () => {
  it("denies a cross-tenant membership and a missing sandbox", () => {
    const result = checkWorkspacePluginContract();
    expect(result.errors).toEqual([]);
  });
});
