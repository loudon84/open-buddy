import { describe, expect, it, vi } from "vitest";
import { RuntimeRegistry, type RuntimeAdapter, type RuntimeHealth, type RuntimeRequest, type RuntimeResponse } from "../../packages/runtime-core/src/index";
import { dispatchPrompt } from "../../electron/main/runtime/dispatch-prompt";
import { snapshot } from "../../electron/main/runtime/runtime-health";
import { RuntimeManager } from "../../electron/main/runtime/runtime-manager";

function fake(options: { id: string; name: string; healthy?: boolean; reply?: string }): RuntimeAdapter {
  const healthy = options.healthy !== false;
  return {
    id: options.id,
    name: options.name,
    type: options.id === "pi" ? "embedded" : "local_process",
    start: vi.fn(async () => undefined),
    stop: vi.fn(async () => undefined),
    async health(): Promise<RuntimeHealth> {
      return {
        status: healthy ? "healthy" : "unhealthy",
        version: healthy ? "1.0" : "unknown",
        endpoint: options.id === "pi" ? "embedded://pi" : "http://127.0.0.1:8642",
      };
    },
    async chat(request: RuntimeRequest): Promise<RuntimeResponse> {
      return { sessionId: "s1", text: options.reply ?? request.text, traceId: "t1" };
    },
    async listCapabilities() {
      return [{ id: "tools", name: "tools" }];
    },
  };
}

describe("platform runtime acceptance", () => {
  it("defaults to pi, switches to a healthy hermes, and refuses an unhealthy switch", async () => {
    const registry = new RuntimeRegistry({ initialActiveId: "pi" });
    registry.registerRuntime(fake({ id: "pi", name: "Pi Runtime" }), { id: "pi", endpoint: "embedded://pi" });
    registry.registerRuntime(fake({ id: "hermes", name: "Hermes Agent", reply: "pong" }), {
      id: "hermes",
      endpoint: "http://127.0.0.1:8642",
    });
    const manager = new RuntimeManager(registry);
    expect(manager.activeId).toBe("pi");
    expect(manager.list().map((row) => row.id)).toEqual(["pi", "hermes"]);
    await manager.switchRuntime("hermes");
    await expect(manager.chat({ text: "ping" })).resolves.toMatchObject({ text: "pong" });
    const rows = await snapshot(registry);
    expect(rows.find((row) => row.id === "hermes")).toMatchObject({ status: "healthy", active: true, endpoint: "http://127.0.0.1:8642" });

    const blocked = new RuntimeRegistry({ initialActiveId: "pi" });
    blocked.registerRuntime(fake({ id: "pi", name: "Pi Runtime" }), { id: "pi", endpoint: "embedded://pi" });
    blocked.registerRuntime(fake({ id: "hermes", name: "Hermes Agent", healthy: false }), {
      id: "hermes",
      endpoint: "http://127.0.0.1:8642",
    });
    await expect(blocked.switchRuntime("hermes")).rejects.toThrow(/unhealthy/);
    expect(blocked.getActive().id).toBe("pi");
  });

  it("keeps pi prompts on the pi host and publishes hermes text without calling pi", async () => {
    const promptPi = vi.fn(async () => undefined);
    const chatActive = vi.fn(async (): Promise<RuntimeResponse> => ({ sessionId: "h1", text: "from-hermes", traceId: "tr" }));
    const publishAssistant = vi.fn();
    await dispatchPrompt({ activeRuntimeId: "pi", text: "hi", promptPi, chatActive, publishAssistant });
    expect(promptPi).toHaveBeenCalledTimes(1);
    expect(chatActive).not.toHaveBeenCalled();

    promptPi.mockClear();
    await dispatchPrompt({ activeRuntimeId: "hermes", text: "hi", promptPi, chatActive, publishAssistant });
    expect(promptPi).not.toHaveBeenCalled();
    expect(chatActive).toHaveBeenCalledTimes(1);
    expect(publishAssistant).toHaveBeenCalledWith({ sessionId: "h1", text: "from-hermes", traceId: "tr" });
  });
});
