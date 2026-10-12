import { describe, expect, it } from "vitest";
import { checkEnterpriseBoundaries } from "../../scripts/architecture/check-enterprise-boundaries.mjs";

describe("P0-02 enterprise boundaries", () => {
  it("requires the agent gateway, the resource gateway, and the deny edges", () => {
    const result = checkEnterpriseBoundaries(["--spec-only"]);
    expect(result.errors).toEqual([]);
    expect(result.ok).toBe(true);
  });
});
