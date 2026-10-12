import { describe, expect, it } from "vitest";
import { checkRuntimeContract } from "../../scripts/architecture/check-runtime-contract.mjs";

describe("P0-04 runtime contract", () => {
  it("maps adapter methods to the project OpenAPI and hides cross-tenant reads", () => {
    const result = checkRuntimeContract();
    expect(result.errors).toEqual([]);
  });
});
