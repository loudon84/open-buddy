import { randomUUID } from "node:crypto";
import type { RuntimeAdapter, RuntimeEvent, Scope } from "../../../packages/runtime/openbuddy-runtime-adapter/src/types";
import { normalizeRuntimeId } from "../../../packages/runtime/openbuddy-runtime-adapter/src/types";
import { rememberRuntimeBinding } from "./runtime-router";
import type { RuntimeBinding, RuntimeBindingStore } from "./runtime-binding";

export interface RuntimeTurn {
  uiSessionId: string;
  text: string;
  artifactIds?: string[];
}

export class RuntimeSessionService {
  private readonly runs = new Map<string, string>();
  private readonly stops = new Map<string, () => void>();
  private epoch = 0;

  constructor(
    private readonly store: RuntimeBindingStore,
    private readonly adapter: Pick<RuntimeAdapter, "createSession" | "sendMessage" | "stream" | "cancel" | "getSession" | "resolveApproval">,
    private readonly scope: () => Scope,
    private readonly publish: (event: { uiSessionId: string; seq: number; type: string; payload: unknown; epoch: number }) => void,
  ) {}

  noteEpoch(epoch: number): void {
    if (epoch === this.epoch) return;
    this.epoch = epoch;
    for (const [sessionId, stop] of this.stops) {
      stop();
      this.store.suspend(sessionId, epoch);
    }
    this.stops.clear();
  }

  async create(input: { uiSessionId: string; runtimeId: string; workspaceId?: string }): Promise<RuntimeBinding> {
    const runtimeId = normalizeRuntimeId(input.runtimeId);
    const existing = this.store.read(input.uiSessionId);
    if (existing.runtimeId !== "local-pi" && existing.remoteSessionId && existing.runtimeId === runtimeId) return existing;
    const now = new Date().toISOString();
    if (runtimeId === "local-pi") {
      const bound = this.store.bind(input.uiSessionId, runtimeId, {
        instanceId: "local-pi",
        lastSeq: 0,
        identityEpoch: this.epoch,
        state: "active",
        createdAt: now,
        source: "local-pi",
      });
      rememberRuntimeBinding(input.uiSessionId, bound);
      return bound;
    }
    const scope = { ...this.scope(), ...(input.workspaceId ? { workspaceId: input.workspaceId } : {}) };
    const requestId = randomUUID();
    const session = await this.adapter.createSession({
      ...scope,
      requestId,
      idempotencyKey: requestId,
      agentInstanceId: runtimeId.replace(/^remote-hermes:/, "") || "hermes",
      workspaceId: scope.workspaceId,
    });
    const bound = this.store.bind(input.uiSessionId, runtimeId.startsWith("remote-hermes:") ? runtimeId : `remote-hermes:${session.agentInstanceId}`, {
      instanceId: session.agentInstanceId,
      remoteSessionId: session.sessionId,
      scope,
      lastSeq: 0,
      identityEpoch: this.epoch,
      state: "active",
      createdAt: now,
    });
    rememberRuntimeBinding(input.uiSessionId, bound);
    this.subscribe(input.uiSessionId, bound);
    return bound;
  }

  async send(input: RuntimeTurn): Promise<{ runId: string; sessionId: string }> {
    const binding = this.store.read(input.uiSessionId);
    if (!binding.remoteSessionId || !binding.scope) throw new Error("[NOT_FOUND] remote session is not bound");
    if (binding.state === "suspended" || binding.identityEpoch !== this.epoch) {
      throw new Error("[CANCELLED] identity epoch changed");
    }
    const requestId = randomUUID();
    const receipt = await this.adapter.sendMessage({
      ...binding.scope,
      requestId,
      idempotencyKey: requestId,
      sessionId: binding.remoteSessionId,
      text: input.text,
      artifactIds: input.artifactIds ?? [],
    });
    this.runs.set(input.uiSessionId, receipt.runId);
    return { runId: receipt.runId, sessionId: binding.remoteSessionId };
  }

  async cancel(uiSessionId: string): Promise<{ accepted: boolean }> {
    const binding = this.store.read(uiSessionId);
    const runId = this.runs.get(uiSessionId);
    if (!binding.remoteSessionId || !binding.scope || !runId) return { accepted: false };
    const requestId = randomUUID();
    return this.adapter.cancel(
      { ...binding.scope, sessionId: binding.remoteSessionId, agentInstanceId: binding.instanceId, runtimeId: binding.runtimeId },
      runId,
      { ...binding.scope, requestId, idempotencyKey: requestId },
    );
  }

  async attach(uiSessionId: string): Promise<RuntimeBinding> {
    const binding = this.store.read(uiSessionId);
    if (!binding.remoteSessionId || !binding.scope) throw new Error("[NOT_FOUND] remote session is not bound");
    const session = await this.adapter.getSession({
      ...binding.scope,
      sessionId: binding.remoteSessionId,
      agentInstanceId: binding.instanceId,
      runtimeId: binding.runtimeId,
    });
    if (session.workspaceId !== binding.scope.workspaceId) throw new Error("[FORBIDDEN] session is outside the workspace");
    return binding;
  }

  private subscribe(uiSessionId: string, binding: RuntimeBinding): void {
    if (!binding.remoteSessionId || !binding.scope) return;
    const epoch = this.epoch;
    const controller = new AbortController();
    this.stops.set(uiSessionId, () => controller.abort());
    const ref = {
      ...binding.scope,
      sessionId: binding.remoteSessionId,
      agentInstanceId: binding.instanceId,
      runtimeId: binding.runtimeId,
    };
    void (async () => {
      try {
        for await (const event of this.adapter.stream(ref, binding.lastSeq, { signal: controller.signal, timeoutMs: 30_000 })) {
          if (this.epoch !== epoch) return;
          this.publish({ uiSessionId, seq: event.seq, type: event.type, payload: event.payload, epoch });
        }
      } catch {
        if (this.epoch !== epoch) return;
      }
    })();
  }

  dropLate(eventEpoch: number): boolean {
    return eventEpoch !== this.epoch;
  }
}

export function projectEvent(seen: Set<string>, event: { uiSessionId: string; seq: number }): boolean {
  const key = `${event.uiSessionId}:${event.seq}`;
  if (seen.has(key)) return false;
  seen.add(key);
  return true;
}

export type { RuntimeEvent };
