import { normalizeRuntimeId } from "../../../packages/runtime/openbuddy-runtime-adapter/src/types";
import type { SessionCatalog } from "../../../packages/runtime/openbuddy-storage/src/sqlite/session-catalog";

export interface RuntimeBinding {
  runtimeId: string;
  instanceId: string;
  remoteSessionId?: string;
  scope?: { tenantId: string; workspaceId: string; actorId: string };
  lastSeq: number;
  identityEpoch: number;
  state: "active" | "suspended";
  createdAt: string;
}

const LOCAL = "local-pi";

export function localBinding(): RuntimeBinding {
  return {
    runtimeId: LOCAL,
    instanceId: "local-pi",
    lastSeq: 0,
    identityEpoch: 0,
    state: "active",
    createdAt: new Date(0).toISOString(),
  };
}

export class RuntimeBindingStore {
  constructor(private readonly catalog: Pick<SessionCatalog, "upsert" | "getBinding" | "setBinding">) {}

  read(sessionId: string): RuntimeBinding {
    const row = this.catalog.getBinding(sessionId, "runtime");
    if (!row) return localBinding();
    const metadata = row.metadata;
    return {
      runtimeId: normalizeRuntimeId(row.bindingId),
      instanceId: typeof metadata.instanceId === "string" ? metadata.instanceId : row.bindingId,
      remoteSessionId: typeof metadata.remoteSessionId === "string" ? metadata.remoteSessionId : undefined,
      scope: metadata.scope as RuntimeBinding["scope"],
      lastSeq: typeof metadata.lastSeq === "number" ? metadata.lastSeq : 0,
      identityEpoch: typeof metadata.identityEpoch === "number" ? metadata.identityEpoch : 0,
      state: metadata.state === "suspended" ? "suspended" : "active",
      createdAt: typeof metadata.createdAt === "string" ? metadata.createdAt : new Date(0).toISOString(),
    };
  }

  bind(sessionId: string, runtimeId: string, metadata: Omit<RuntimeBinding, "runtimeId"> & { source?: string }): RuntimeBinding {
    const nextId = normalizeRuntimeId(runtimeId);
    const existing = this.catalog.getBinding(sessionId, "runtime");
    if (existing && normalizeRuntimeId(existing.bindingId) !== nextId) {
      throw new Error("[CONFLICT] runtime binding is immutable");
    }
    if (!existing) {
      const now = metadata.createdAt;
      this.catalog.upsert({
        sessionId,
        workspaceCwd: metadata.scope?.workspaceId ?? "remote",
        sourcePath: `remote-runtime://${sessionId}`,
        sourceHash: "remote-runtime",
        title: sessionId,
        createdAt: now,
        updatedAt: now,
        messageCount: 0,
        pinned: false,
        archived: false,
        metadata: { source: metadata.source ?? "remote-runtime" },
      });
      this.catalog.setBinding(sessionId, "runtime", nextId, { ...metadata, instanceId: metadata.instanceId });
    }
    return this.read(sessionId);
  }

  suspend(sessionId: string, epoch: number): void {
    const current = this.read(sessionId);
    if (current.runtimeId === LOCAL && !this.catalog.getBinding(sessionId, "runtime")) return;
    this.catalog.setBinding(sessionId, "runtime", current.runtimeId, { ...current, identityEpoch: epoch, state: "suspended" });
  }
}
