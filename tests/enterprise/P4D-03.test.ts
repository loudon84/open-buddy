import { describe, expect, it } from "vitest";
import { MetricService, type AccessPolicy } from "../../services/enterprise-bi/src/metrics";

describe("P4D-03 metric explain and export", () => {
  it("explains the filtered total and exports only with the export grant", () => {
    const policies = new Map<string, AccessPolicy>([
      ["viewer", { version: 1, metrics: ["orders"], regions: ["north"], canExport: false }],
      ["exporter", { version: 1, metrics: ["orders"], regions: ["north"], canExport: true }],
    ]);
    const service = new MetricService(
      [
        { tenantId: "tenant-a", metricId: "orders", region: "north", value: 2 },
        { tenantId: "tenant-a", metricId: "orders", region: "south", value: 5 },
      ],
      (caller) => policies.get(caller.actorId) ?? null,
    );
    expect(service.explain({ tenantId: "tenant-a", actorId: "viewer" }, "orders")).toMatchObject({
      metricId: "orders",
      value: 2,
      regions: ["north"],
      expression: "fixture-count",
      signed: false,
    });
    expect(() => service.export({ tenantId: "tenant-a", actorId: "viewer" }, "orders")).toThrow(/export/);
    expect(service.export({ tenantId: "tenant-a", actorId: "exporter" }, "orders")).toBe("metric,value,regions\norders,2,north");
  });
});
