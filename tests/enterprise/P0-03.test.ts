import { describe, expect, it } from "vitest";
import { checkHermesCapabilityMatrix } from "../../scripts/architecture/check-hermes-capability-matrix.mjs";

describe("P0-03 hermes capability matrix", () => {
  it("labels client observations and refuses an unconfigured staging probe", () => {
    const fixtures = checkHermesCapabilityMatrix(["--fixtures"]);
    expect(fixtures.errors).toEqual([]);
    const staging = checkHermesCapabilityMatrix(["--profile=staging"]);
    expect(staging.ok).toBe(false);
  });
});
