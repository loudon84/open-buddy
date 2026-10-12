export const metricContract = {
  probed: false,
  metrics: [{ id: "orders", expression: "fixture-count", signed: false }],
};

export interface MetricRow {
  tenantId: string;
  metricId: string;
  region: string;
  value: number;
}

export interface Caller {
  tenantId: string;
  actorId: string;
}

/** Server-side policy for one caller. `version` changes whenever the policy is edited or revoked. */
export interface AccessPolicy {
  version: number;
  metrics: string[];
  regions: string[];
  canExport: boolean;
}

export type PolicySource = (caller: Caller) => AccessPolicy | null;

export interface MetricAnswer {
  metricId: string;
  value: number;
  regions: string[];
  policyVersion: number;
  dataVersion: number;
}

const maxLimit = 100;

export class MetricService {
  private readonly cache = new Map<string, MetricAnswer>();
  private dataVersion = 1;

  constructor(
    private rows: MetricRow[],
    private readonly policies: PolicySource,
  ) {}

  replaceRows(rows: MetricRow[]): void {
    this.rows = rows;
    this.dataVersion += 1;
    this.cache.clear();
  }

  query(caller: Caller, metricId: string, limit: number): MetricAnswer {
    if (limit > maxLimit) throw new Error("limit");
    const policy = this.requirePolicy(caller, metricId);
    const key = JSON.stringify([caller.tenantId, caller.actorId, metricId, policy.version, this.dataVersion]);
    const cached = this.cache.get(key);
    if (cached) return cached;
    const visible = this.rows.filter(
      (row) => row.tenantId === caller.tenantId && row.metricId === metricId && policy.regions.includes(row.region),
    );
    const answer: MetricAnswer = {
      metricId,
      value: visible.reduce((sum, row) => sum + row.value, 0),
      regions: [...new Set(visible.map((row) => row.region))].sort(),
      policyVersion: policy.version,
      dataVersion: this.dataVersion,
    };
    this.cache.set(key, answer);
    return answer;
  }

  /** Drops every cached answer for the caller; call after a policy edit or revoke. */
  revoke(caller: Caller): void {
    const prefix = JSON.stringify([caller.tenantId, caller.actorId]).slice(0, -1);
    for (const key of [...this.cache.keys()]) {
      if (key.startsWith(prefix)) this.cache.delete(key);
    }
  }

  explain(caller: Caller, metricId: string): MetricAnswer & { expression: string; signed: false } {
    const answer = this.query(caller, metricId, 1);
    const expression = metricContract.metrics.find((metric) => metric.id === metricId)?.expression ?? "unknown";
    return { ...answer, expression, signed: false };
  }

  export(caller: Caller, metricId: string): string {
    const policy = this.requirePolicy(caller, metricId);
    if (!policy.canExport) throw new Error("export");
    const answer = this.query(caller, metricId, 1);
    return `metric,value,regions\n${answer.metricId},${answer.value},${answer.regions.join("|")}`;
  }

  private requirePolicy(caller: Caller, metricId: string): AccessPolicy {
    const policy = this.policies(caller);
    if (!policy || !policy.metrics.includes(metricId)) throw new Error("metric not granted");
    return policy;
  }
}
