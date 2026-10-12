import { describe, expect, it } from "vitest";
import { MetricCache } from "../../services/enterprise-bi/src/metrics.ts";

describe("P4D-02 metric cache", () => {
  it("keeps totals inside the tenant and drops them on clear", () => {
    const cache = new MetricCache([
      { tenantId: "tenant-a", metricId: "orders", value: 2 },
      { tenantId: "tenant-b", metricId: "orders", value: 9 },
    ]);
    expect(cache.query("tenant-a", "orders", 10)).toBe(2);
    expect(cache.query("tenant-b", "orders", 10)).toBe(9);
    expect(() => cache.query("tenant-a", "orders", 101)).toThrow(/limit/);
    cache.clear("tenant-a");
    expect(cache.query("tenant-a", "orders", 10)).toBe(2);
  });
});
