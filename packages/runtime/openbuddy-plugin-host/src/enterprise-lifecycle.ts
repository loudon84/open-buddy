export interface InstallSnapshot {
  version: string;
  schema: number;
  permissions: string[];
  routes: string[];
  tools: string[];
  mcp: string[];
  business: string[];
}

export class PluginLifecycle {
  private current: InstallSnapshot | null = null;
  private state: "absent" | "enabled" | "disabled" = "absent";
  readonly revoked = new Set<string>();

  apply(next: InstallSnapshot, policy: { minSchema: number; allowed: string[] }): InstallSnapshot {
    if (next.schema < policy.minSchema) throw new Error("schema blocked");
    for (const permission of next.permissions) {
      if (this.revoked.has(permission) || !policy.allowed.includes(permission)) {
        throw new Error("permission blocked");
      }
    }
    this.current = {
      ...next,
      routes: [...next.routes],
      tools: [...next.tools],
      mcp: [...next.mcp],
      business: [...next.business],
      permissions: [...next.permissions],
    };
    this.state = "enabled";
    return this.current;
  }

  upgrade(next: InstallSnapshot, policy: { minSchema: number; allowed: string[] }): InstallSnapshot {
    const previous = this.current ? { ...this.current, routes: [...this.current.routes], tools: [...this.current.tools], mcp: [...this.current.mcp], business: [...this.current.business], permissions: [...this.current.permissions] } : null;
    try {
      return this.apply(next, policy);
    } catch (error) {
      this.current = previous;
      this.state = previous ? "enabled" : "absent";
      throw error;
    }
  }

  disable(): void {
    if (!this.current) return;
    this.current = { ...this.current, routes: [], tools: [], mcp: [] };
    this.state = "disabled";
  }

  uninstall(): { business: string[] } {
    const business = this.current?.business ?? [];
    this.current = null;
    this.state = "absent";
    return { business };
  }

  rollback(snapshot: InstallSnapshot, policy: { minSchema: number; allowed: string[] }): InstallSnapshot {
    return this.apply(snapshot, policy);
  }

  status(): { state: string; version: string | null; routes: string[] } {
    return { state: this.state, version: this.current?.version ?? null, routes: this.current?.routes ?? [] };
  }
}
