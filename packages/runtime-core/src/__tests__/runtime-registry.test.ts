import { describe, expect, it, vi } from "vitest";
import { parseRuntimeConfig } from "../runtime-config";
import { assertTransition } from "../runtime-adapter";
import { RuntimeRegistry } from "../runtime-registry";
import type { Capability, RuntimeAdapter, RuntimeHealth, RuntimeRequest, RuntimeResponse } from "../runtime-adapter";

function fakeRuntime(options: {
  id: string;
  name: string;
  healthy?: boolean;
  reply?: string;
}): RuntimeAdapter & { start: ReturnType<typeof vi.fn>; stop: ReturnType<typeof vi.fn> } {
  const healthy = options.healthy !== false;
  const start = vi.fn(async () => undefined);
  const stop = vi.fn(async () => undefined);
  return {
    id: options.id,
    name: options.name,
    type: options.id === "pi" ? "embedded" : "local_process",
    start,
    stop,
    async health(): Promise<RuntimeHealth> {
      return {
        status: healthy ? "healthy" : "unhealthy",
        version: healthy ? "1.0" : "unknown",
        endpoint: options.id === "pi" ? "embedded://pi" : "http://127.0.0.1:8642",
        message: healthy ? undefined : "down",
      };
    },
    async chat(request: RuntimeRequest): Promise<RuntimeResponse> {
      return { sessionId: "s1", text: options.reply ?? request.text, traceId: "t1" };
    },
    async listCapabilities(): Promise<Capability[]> {
      return [{ id: "tools", name: "tools" }];
    },
  };
}

describe("RuntimeRegistry", () => {
  it("rejects a duplicate runtime id and an unknown id", () => {
    const registry = new RuntimeRegistry();
    registry.registerRuntime(fakeRuntime({ id: "pi", name: "Pi Runtime" }), { id: "pi", endpoint: "embedded://pi" });
    expect(() => registry.registerRuntime(fakeRuntime({ id: "pi", name: "Pi Runtime" }), { id: "pi", endpoint: "embedded://pi" })).toThrow(/duplicate/);
    expect(() => registry.getRuntime("missing")).toThrow(/unknown/);
  });

  it("rejects an illegal phase transition", () => {
    expect(() => assertTransition("UNINITIALIZED", "RUNNING")).toThrow(/illegal/);
  });

  it("keeps the active runtime when the target is unhealthy", async () => {
    const registry = new RuntimeRegistry({ initialActiveId: "pi" });
    registry.registerRuntime(fakeRuntime({ id: "pi", name: "Pi Runtime" }), { id: "pi", endpoint: "embedded://pi" });
    registry.registerRuntime(fakeRuntime({ id: "hermes", name: "Hermes Agent", healthy: false }), {
      id: "hermes",
      endpoint: "http://127.0.0.1:8642",
    });
    await expect(registry.switchRuntime("hermes")).rejects.toThrow(/unhealthy/);
    expect(registry.getActive().id).toBe("pi");
  });

  it("starts the target and stops a running predecessor", async () => {
    const registry = new RuntimeRegistry({ initialActiveId: "pi" });
    const pi = fakeRuntime({ id: "pi", name: "Pi Runtime" });
    const hermes = fakeRuntime({ id: "hermes", name: "Hermes Agent", reply: "pong" });
    registry.registerRuntime(pi, { id: "pi", endpoint: "embedded://pi" });
    registry.registerRuntime(hermes, { id: "hermes", endpoint: "http://127.0.0.1:8642" });
    await registry.switchRuntime("pi");
    await registry.switchRuntime("hermes");
    expect(pi.stop).toHaveBeenCalledTimes(1);
    expect(hermes.start).toHaveBeenCalled();
    expect(registry.getActive().id).toBe("hermes");
    expect(registry.list().find((row) => row.id === "hermes")?.phase).toBe("RUNNING");
    expect(await registry.getActive().chat({ text: "ping" })).toMatchObject({ text: "pong" });
  });
});

describe("parseRuntimeConfig", () => {
  it("rejects an inline token", () => {
    expect(() => parseRuntimeConfig({ id: "hermes", endpoint: "http://127.0.0.1:8642", token: "secret" })).toThrow(/token/);
  });

  it("keeps a secret reference", () => {
    expect(parseRuntimeConfig({ id: "hermes", endpoint: "http://127.0.0.1:8642", secretRef: "keychain:hermes" })).toEqual({
      id: "hermes",
      endpoint: "http://127.0.0.1:8642",
      secretRef: "keychain:hermes",
    });
  });
});
