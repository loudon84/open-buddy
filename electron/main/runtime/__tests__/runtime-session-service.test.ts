import { describe, expect, it, vi } from "vitest";
import type { RuntimeAdapter, Session } from "../../../../packages/runtime/openbuddy-runtime-adapter/src/types";
import { RuntimeBindingStore, type RuntimeBinding } from "../runtime-binding";
import { RuntimeSessionService } from "../runtime-session-service";

function memoryStore(): RuntimeBindingStore {
  const rows = new Map<string, { bindingId: string; metadata: Record<string, unknown> }>();
  const sessions = new Set<string>();
  return new RuntimeBindingStore({
    upsert(record) {
      sessions.add(record.sessionId);
    },
    getBinding(sessionId) {
      return rows.get(sessionId) ?? null;
    },
    setBinding(sessionId, _type, bindingId, metadata) {
      rows.set(sessionId, { bindingId, metadata });
    },
  });
}

function session(id: string): Session {
  return {
    tenantId: "t",
    workspaceId: "w",
    actorId: "a",
    sessionId: id,
    agentInstanceId: "h1",
    runtimeId: "remote-hermes:h1",
    status: "idle",
    revision: 0,
    lastSeq: 0,
    createdAt: "t",
    updatedAt: "t",
  };
}

describe("runtime session service", () => {
  it("creates the remote session once and reuses the same SessionRef", async () => {
    const createSession = vi.fn(async () => session("remote-1"));
    const sendMessage = vi.fn(async () => ({ sessionId: "remote-1", runId: "run-1", status: "accepted" as const, traceId: "tr" }));
    const adapter = {
      createSession,
      sendMessage,
      stream: async function* () {},
      cancel: vi.fn(async () => ({ accepted: true })),
      getSession: vi.fn(async () => session("remote-1")),
      resolveApproval: vi.fn(),
    } as Pick<RuntimeAdapter, "createSession" | "sendMessage" | "stream" | "cancel" | "getSession" | "resolveApproval">;
    const service = new RuntimeSessionService(memoryStore(), adapter, () => ({ tenantId: "t", workspaceId: "w", actorId: "a" }), () => undefined);
    await service.create({ uiSessionId: "ui-1", runtimeId: "remote-hermes" });
    await service.send({ uiSessionId: "ui-1", text: "one" });
    await service.send({ uiSessionId: "ui-1", text: "two" });
    expect(createSession).toHaveBeenCalledTimes(1);
    expect(sendMessage).toHaveBeenNthCalledWith(1, expect.objectContaining({ sessionId: "remote-1", text: "one" }));
    expect(sendMessage).toHaveBeenNthCalledWith(2, expect.objectContaining({ sessionId: "remote-1", text: "two" }));
  });

  it("drops events from an older identity epoch", () => {
    const service = new RuntimeSessionService(memoryStore(), {} as never, () => ({ tenantId: "t", workspaceId: "w", actorId: "a" }), () => undefined);
    expect(service.dropLate(0)).toBe(false);
    service.noteEpoch(2);
    expect(service.dropLate(0)).toBe(true);
  });
});

void (0 as unknown as RuntimeBinding);
