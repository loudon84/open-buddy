import { describe, expect, it } from "vitest";
import { explain, exportMetric } from "../../services/enterprise-bi/src/metrics.ts";

describe("P4D-03 metric explain", () => {
  it("names the metric and refuses an ungranted export", () => {
    expect(explain("orders", 2)).toEqual({ metricId: "orders", value: 2, signed: false });
    expect(exportMetric(true, 2)).toBe("value,2");
    expect(() => exportMetric(false, 2)).toThrow(/export/);
  });
});
