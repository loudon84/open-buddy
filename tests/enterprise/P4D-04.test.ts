import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { MetricService, metricContract } from "../../services/enterprise-bi/src/metrics";

describe("P4D-04 BI acceptance", () => {
  it("compares fixture totals without a signed source", () => {
    expect(metricContract.probed).toBe(false);
    const service = new MetricService(
      [{ tenantId: "tenant-a", metricId: "orders", region: "north", value: 2 }],
      () => ({ version: 1, metrics: ["orders"], regions: ["north"], canExport: false }),
    );
    expect(service.query({ tenantId: "tenant-a", actorId: "analyst" }, "orders", 10).value).toBe(2);
    expect(readFileSync("scripts/enterprise/bi-smoke.mjs", "utf8")).toContain("process.exit(2)");
  });
});
