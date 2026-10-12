import { describe, expect, it } from "vitest";
import { commitQuote, prepareQuote } from "../../services/enterprise-ontology/src/catalog.ts";

describe("P4E-03 quotes", () => {
  it("compensates a commit that is not approved", () => {
    const prepared = prepareQuote("q1");
    expect(commitQuote(prepared, true).committed).toBe(true);
    expect(commitQuote(prepared, false)).toMatchObject({ committed: false, compensated: true });
  });
});
