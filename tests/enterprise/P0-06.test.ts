import { describe, expect, it } from "vitest";
import { checkEnterpriseBoundaries } from "../../scripts/architecture/check-enterprise-boundaries.mjs";

describe("P0-06 enterprise boundary scan", () => {
  it("reports the fixture import and accepts the current tree", () => {
    const result = checkEnterpriseBoundaries([]);
    expect(result.fixtureViolations.length).toBeGreaterThan(0);
    expect(result.realViolations).toEqual([]);
    expect(result.errors).toEqual([]);
  });
});
