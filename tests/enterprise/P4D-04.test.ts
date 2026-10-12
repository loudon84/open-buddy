import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { MetricCache, metricContract } from "../../services/enterprise-bi/src/metrics.ts";

describe("P4D-04 BI acceptance", () => {
  it("compares fixture totals without a signed source", () => {
    expect(metricContract.probed).toBe(false);
    const cache = new MetricCache([{ tenantId: "tenant-a", metricId: "orders", value: 2 }]);
    expect(cache.query("tenant-a", "orders", 10)).toBe(2);
    expect(readFileSync("scripts/enterprise/bi-smoke.mjs", "utf8")).toContain("process.exit(2)");
  });
});
