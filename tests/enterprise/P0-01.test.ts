import { describe, expect, it } from "vitest";
import { checkBaselineInventory } from "../../scripts/architecture/check-baseline-inventory.mjs";

describe("P0-01 baseline inventory", () => {
  it("freezes the apps/work closure and does not retune target React ranges", () => {
    const result = checkBaselineInventory();
    expect(result.errors).toEqual([]);
    expect(result.ok).toBe(true);
  });
});
