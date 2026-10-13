import type { Capability, RuntimeRegistry } from "../../../packages/runtime-core/src/index";

export interface RuntimeHealthRow {
  id: string;
  name: string;
  version: string;
  status: "healthy" | "unhealthy";
  endpoint: string;
  capabilities: Capability[];
  active: boolean;
}

export async function snapshot(registry: RuntimeRegistry): Promise<RuntimeHealthRow[]> {
  const activeId = registry.getActive().id;
  const rows: RuntimeHealthRow[] = [];
  for (const item of registry.list()) {
    const adapter = registry.getRuntime(item.id);
    const health = await adapter.health();
    const capabilities = health.status === "healthy" ? await adapter.listCapabilities() : [];
    rows.push({
      id: item.id,
      name: item.name,
      version: health.version,
      status: health.status,
      endpoint: health.endpoint,
      capabilities,
      active: item.id === activeId,
    });
  }
  return rows;
}
