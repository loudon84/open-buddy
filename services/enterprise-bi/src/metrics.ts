export const metricContract = {
  probed: false,
  metrics: [{ id: "orders", expression: "fixture-count", signed: false }],
};

export interface MetricRow {
  tenantId: string;
  metricId: string;
  value: number;
}

export class MetricCache {
  private readonly cache = new Map<string, number>();

  constructor(private readonly rows: MetricRow[]) {}

  query(tenantId: string, metricId: string, limit: number): number {
    if (limit > 100) throw new Error("limit");
    const key = `${tenantId}:${metricId}`;
    const cached = this.cache.get(key);
    if (cached !== undefined) return cached;
    const value = this.rows.filter((row) => row.tenantId === tenantId && row.metricId === metricId).reduce((sum, row) => sum + row.value, 0);
    this.cache.set(key, value);
    return value;
  }

  clear(tenantId: string): void {
    for (const key of [...this.cache.keys()]) {
      if (key.startsWith(`${tenantId}:`)) this.cache.delete(key);
    }
  }
}

export function explain(metricId: string, value: number): { metricId: string; value: number; signed: false } {
  return { metricId, value, signed: false };
}

export function exportMetric(grant: boolean, value: number): string {
  if (!grant) throw new Error("export");
  return `value,${value}`;
}
