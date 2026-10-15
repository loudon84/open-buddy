import { beforeEach, describe, expect, it, vi } from "vitest";
import type { IdentityContext } from "@openbuddy/shared-types";
import { registerPromptCycleIpc } from "../prompt-cycle";
import { forgetRuntimeBinding, rememberRuntimeBinding } from "../../runtime/runtime-router";
import { setRuntimeSessionService } from "../../runtime/runtime-session-handle";

const handlers = new Map<string, (event: unknown, input: unknown) => Promise<unknown>>();
const prompt = vi.fn(async () => undefined);
const chat = vi.fn(async () => ({ sessionId: "s1", text: "ok", traceId: "t" }));
const audits: Array<Record<string, unknown>> = [];
let activeId = "pi";
let context: IdentityContext | null = null;

vi.mock("electron", () => ({
  ipcMain: { handle: (channel: string, fn: (event: unknown, input: unknown) => Promise<unknown>) => handlers.set(channel, fn) },
}));
vi.mock("../../runtime/platform-runtime-handle", () => ({
  getPlatformRuntimeManager: () => (activeId === "pi" ? null : { activeId, chat }),
}));
vi.mock("../../casdoor/casdoor-audit", () => ({
  casdoorAudit: { record: async (event: Record<string, unknown>) => { audits.push(event); } },
}));
vi.mock("../../agent/agent-host-log", () => ({
  hostReceived: vi.fn(),
  hostDispatched: vi.fn(),
  hostFailed: vi.fn(),
}));
vi.mock("../../runtime/publish-assistant-turn", () => ({ publishAssistantTurn: vi.fn() }));

const allowed: IdentityContext = {
  user: { id: "user-1", name: "Ada" },
  tenant: { id: "tenant-1", name: "ACME" },
  roles: [],
  permissions: [],
  policies: { agents: ["pi", "hermes"] },
};

describe("agent:prompt identity", () => {
  beforeEach(async () => {
    handlers.clear();
    prompt.mockClear();
    chat.mockClear();
    audits.length = 0;
    activeId = "pi";
    context = null;
    forgetRuntimeBinding("s1");
    setRuntimeSessionService(null);
    registerPromptCycleIpc({
      ensureAgentHost: async () => undefined,
      agentHost: {
        prompt,
        getSession: () => ({ sessionId: "s1" }),
        extensionsBound: () => Promise.resolve(),
      } as never,
      casdoorAuth: {} as never,
      getWindow: () => null,
      getIdentityContext: () => context,
    });
  });

  it("leaves the pi prompt unchanged when there is no identity context", async () => {
    await handlers.get("agent:prompt")?.({}, { text: "hi", sessionId: "s1" });
    expect(prompt).toHaveBeenCalledWith("hi", expect.objectContaining({ sessionId: "s1", identityContext: undefined }));
    expect(audits).toHaveLength(0);
  });

  it("injects the context and refuses a runtime the policies do not allow", async () => {
    context = allowed;
    await handlers.get("agent:prompt")?.({}, { text: "hi", sessionId: "s1" });
    expect(prompt).toHaveBeenCalledWith("hi", expect.objectContaining({ identityContext: allowed }));
    expect(audits[0]).toMatchObject({ event: "identity.context.use", subject: "user-1", tenantId: "tenant-1" });

    prompt.mockClear();
    context = { ...allowed, policies: { agents: ["hermes"] } };
    await expect(handlers.get("agent:prompt")?.({}, { text: "hi", sessionId: "s1" })).rejects.toThrow("当前账号无权限使用该 Agent");
    expect(prompt).not.toHaveBeenCalled();
  });

  it("sends a bound hermes session through the runtime service and does not call pi", async () => {
    const send = vi.fn(async () => ({ runId: "r", sessionId: "remote" }));
    setRuntimeSessionService({ send } as never);
    rememberRuntimeBinding("s1", {
      runtimeId: "remote-hermes:h",
      instanceId: "h",
      remoteSessionId: "remote",
      lastSeq: 0,
      identityEpoch: 0,
      state: "active",
      createdAt: "t",
    });
    context = allowed;
    await handlers.get("agent:prompt")?.({}, { text: "hi", sessionId: "s1" });
    expect(send).toHaveBeenCalledWith({ uiSessionId: "s1", text: "hi" });
    expect(prompt).not.toHaveBeenCalled();
    expect(chat).not.toHaveBeenCalled();
  });
});
