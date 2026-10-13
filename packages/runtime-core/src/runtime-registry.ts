import { assertTransition, type RuntimeAdapter, type RuntimePhase } from "./runtime-adapter";
import type { RuntimeConfig } from "./runtime-config";

export interface RuntimeListItem {
  id: string;
  name: string;
  type: RuntimeAdapter["type"];
  phase: RuntimePhase;
  endpoint: string;
}

export class RuntimeRegistry {
  private readonly adapters = new Map<string, RuntimeAdapter>();
  private readonly phases = new Map<string, RuntimePhase>();
  private readonly endpoints = new Map<string, string>();
  private activeId: string | null = null;

  constructor(private readonly options?: { initialActiveId?: string }) {}

  registerRuntime(adapter: RuntimeAdapter, config: RuntimeConfig): void {
    if (config.id !== adapter.id) throw new Error(`runtime config id ${config.id} does not match ${adapter.id}`);
    if (this.adapters.has(adapter.id)) throw new Error(`duplicate runtime id ${adapter.id}`);
    this.adapters.set(adapter.id, adapter);
    this.endpoints.set(adapter.id, config.endpoint);
    this.phases.set(adapter.id, "UNINITIALIZED");
    this.move(adapter.id, "INIT");
    this.move(adapter.id, "READY");
  }

  getRuntime(id: string): RuntimeAdapter {
    const adapter = this.adapters.get(id);
    if (!adapter) throw new Error(`unknown runtime id ${id}`);
    return adapter;
  }

  async switchRuntime(id: string): Promise<void> {
    const target = this.getRuntime(id);
    const health = await target.health();
    if (health.status !== "healthy") {
      throw new Error(`runtime ${id} is unhealthy`);
    }
    const previousId = this.activeId ?? (this.adapters.has(this.options?.initialActiveId ?? "") ? this.options?.initialActiveId ?? null : null);
    if (previousId && previousId !== id && this.phases.get(previousId) === "RUNNING") {
      this.move(previousId, "STOPPED");
      await this.getRuntime(previousId).stop();
    }
    const phase = this.phases.get(id);
    if (phase === "READY" || phase === "STOPPED") this.move(id, "START");
    else throw new Error(`illegal runtime transition ${phase} -> START`);
    try {
      await target.start();
      this.move(id, "RUNNING");
    } catch (error) {
      this.move(id, "ERROR");
      throw error;
    }
    this.activeId = id;
  }

  getActive(): RuntimeAdapter {
    if (!this.activeId && this.options?.initialActiveId && this.adapters.has(this.options.initialActiveId)) {
      this.activeId = this.options.initialActiveId;
    }
    if (!this.activeId) throw new Error("no active runtime");
    return this.getRuntime(this.activeId);
  }

  list(): RuntimeListItem[] {
    return [...this.adapters.values()].map((adapter) => ({
      id: adapter.id,
      name: adapter.name,
      type: adapter.type,
      phase: this.phases.get(adapter.id) ?? "UNINITIALIZED",
      endpoint: this.endpoints.get(adapter.id) ?? "",
    }));
  }

  private move(id: string, to: RuntimePhase): void {
    const from = this.phases.get(id);
    if (!from) throw new Error(`unknown runtime id ${id}`);
    assertTransition(from, to);
    this.phases.set(id, to);
  }
}
