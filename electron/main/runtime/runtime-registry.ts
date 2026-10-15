import type { TokenSource } from "../../../packages/runtime/openbuddy-hermes-client/src/transport";
import { RuntimeRegistry } from "../../../packages/runtime-core/src/index";
import { HermesAdapter } from "../../../packages/runtime-adapters/src/hermes-adapter";
import { PiAdapter } from "../../../packages/runtime-adapters/src/pi-adapter";
import { bindLocalPiRuntime } from "./bind-local-pi";
import type { LocalPiPort } from "./local-pi-adapter";
import { setPlatformRuntimeManager } from "./platform-runtime-handle";
import { RuntimeManager } from "./runtime-manager";

const piSlot: { bound: boolean; current: LocalPiPort & { installationId: string } } = {
  bound: false,
  current: {
    installationId: "desktop",
    async loadEntries() {
      return [];
    },
    async continueSession(sessionPath: string) {
      return { sessionId: "pi-desktop", sessionPath };
    },
    async send() {
      return { runId: "pi-desktop" };
    },
    async abort() {},
    subscribe() {
      return () => undefined;
    },
    async respondPermission() {},
  },
};

const piPort: LocalPiPort & { installationId: string } = {
  get bound() {
    return piSlot.bound;
  },
  get installationId() {
    return piSlot.current.installationId;
  },
  loadEntries: (sessionPath) => piSlot.current.loadEntries(sessionPath),
  continueSession: (sessionPath) => piSlot.current.continueSession(sessionPath),
  send: (text) => piSlot.current.send(text),
  abort: () => piSlot.current.abort(),
  subscribe: (listener) => piSlot.current.subscribe(listener),
  respondPermission: (requestId, decision) => piSlot.current.respondPermission(requestId, decision),
};

export function installPlatformPiBinding(
  runtime: { session: { abort(): Promise<void> } | null },
  host: Pick<LocalPiPort, "continueSession" | "send" | "subscribe" | "respondPermission">,
): void {
  const bound = bindLocalPiRuntime(runtime as never, host);
  piSlot.current = { ...bound, installationId: piSlot.current.installationId, bound: true };
  piSlot.bound = true;
}

export function createPlatformRuntime(options: { endpoint: string; tokens: TokenSource }): RuntimeManager {
  const registry = new RuntimeRegistry({ initialActiveId: "pi" });
  registry.registerRuntime(new PiAdapter(piPort), { id: "pi", endpoint: "embedded://pi" });
  registry.registerRuntime(new HermesAdapter({ endpoint: options.endpoint, tokens: options.tokens }), {
    id: "hermes",
    endpoint: options.endpoint,
  });
  const manager = new RuntimeManager(registry);
  setPlatformRuntimeManager(manager);
  return manager;
}
