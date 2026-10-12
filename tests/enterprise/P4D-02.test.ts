import { describe, expect, it } from "vitest";
import { MetricService, type AccessPolicy, type MetricRow } from "../../services/enterprise-bi/src/metrics";

const rows: MetricRow[] = [
  { tenantId: "tenant-a", metricId: "orders", region: "north", value: 2 },
  { tenantId: "tenant-a", metricId: "orders", region: "south", value: 5 },
  { tenantId: "tenant-b", metricId: "orders", region: "north", value: 9 },
];

describe("P4D-02 metric policy and cache", () => {
  it("aggregates only the rows each user may see, even inside one tenant", () => {
    const policies = new Map<string, AccessPolicy>([
      ["north-analyst", { version: 1, metrics: ["orders"], regions: ["north"], canExport: false }],
      ["all-analyst", { version: 1, metrics: ["orders"], regions: ["north", "south"], canExport: false }],
    ]);
    const service = new MetricService(rows, (caller) => policies.get(caller.actorId) ?? null);
    expect(service.query({ tenantId: "tenant-a", actorId: "north-analyst" }, "orders", 10).value).toBe(2);
    expect(service.query({ tenantId: "tenant-a", actorId: "all-analyst" }, "orders", 10).value).toBe(7);
    expect(service.query({ tenantId: "tenant-b", actorId: "north-analyst" }, "orders", 10).value).toBe(9);
    expect(() => service.query({ tenantId: "tenant-a", actorId: "stranger" }, "orders", 10)).toThrow(/not granted/);
    expect(() => service.query({ tenantId: "tenant-a", actorId: "all-analyst" }, "orders", 101)).toThrow(/limit/);
  });

  it("does not serve a cached total after the policy narrows or the data changes", () => {
    const policies = new Map<string, AccessPolicy>([
      ["analyst", { version: 1, metrics: ["orders"], regions: ["north", "south"], canExport: false }],
    ]);
    const service = new MetricService(rows, (caller) => policies.get(caller.actorId) ?? null);
    const caller = { tenantId: "tenant-a", actorId: "analyst" };
    expect(service.query(caller, "orders", 10).value).toBe(7);
    policies.set("analyst", { version: 2, metrics: ["orders"], regions: ["north"], canExport: false });
    service.revoke(caller);
    expect(service.query(caller, "orders", 10).value).toBe(2);
    policies.delete("analyst");
    expect(() => service.query(caller, "orders", 10)).toThrow(/not granted/);

    policies.set("analyst", { version: 3, metrics: ["orders"], regions: ["north"], canExport: false });
    service.replaceRows([...rows, { tenantId: "tenant-a", metricId: "orders", region: "north", value: 10 }]);
    expect(service.query(caller, "orders", 10).value).toBe(12);
  });
});
