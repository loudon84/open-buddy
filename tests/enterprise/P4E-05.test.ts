import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { commitQuote, prepareQuote } from "../../services/enterprise-ontology/src/catalog.ts";

describe("P4E-05 yearly journey", () => {
  it("records the fixture journey and the unsigned follow-up", () => {
    expect(commitQuote(prepareQuote("year"), true).committed).toBe(true);
    const script = readFileSync("scripts/enterprise/ontology-smoke.mjs", "utf8");
    expect(script).toContain("process.exit(2)");
    expect(script).toContain("D08 connector");
  });
});
