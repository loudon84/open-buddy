export const isolationPaths = [
  "list",
  "id",
  "search",
  "cache",
  "event",
  "download",
  "tool",
  "approval",
  "member",
] as const;

export type IsolationPath = (typeof isolationPaths)[number];

export interface ScopedRecord {
  id: string;
  tenantId: string;
  workspaceId: string;
  path: IsolationPath;
  title: string;
  revoked: boolean;
}

export interface Caller {
  tenantId: string;
  workspaceId: string;
  userId: string;
}

export class IsolationDirectory {
  private readonly records: ScopedRecord[] = [];
  private readonly cache = new Map<string, string[]>();

  put(record: Omit<ScopedRecord, "revoked">): void {
    this.records.push({ ...record, revoked: false });
    this.cache.clear();
  }

  revoke(id: string): void {
    const record = this.records.find((item) => item.id === id);
    if (!record) throw new Error("not found");
    record.revoked = true;
    this.cache.clear();
  }

  visible(caller: Caller, path: IsolationPath, query?: string): ScopedRecord[] {
    const cacheKey = `${caller.tenantId}:${caller.workspaceId}:${caller.userId}:${path}:${query ?? ""}`;
    const cached = this.cache.get(cacheKey);
    const matched = this.records.filter((record) => {
      if (record.revoked) return false;
      if (record.tenantId !== caller.tenantId || record.workspaceId !== caller.workspaceId) return false;
      if (record.path !== path) return false;
      if (query && !record.title.includes(query)) return false;
      return true;
    });
    const ids = matched.map((record) => record.id);
    if (cached && cached.join() !== ids.join()) {
      throw new Error("stale cache");
    }
    this.cache.set(cacheKey, ids);
    return matched;
  }

  snapshot(): ScopedRecord[] {
    return this.records.map((record) => ({ ...record }));
  }

  static restore(rows: ScopedRecord[], gatewayIds: string[]): { missing: string[] } {
    const present = new Set(rows.map((row) => row.id));
    return { missing: gatewayIds.filter((id) => !present.has(id)) };
  }
}
