import type { Capability, RuntimeAdapter, RuntimeHealth, RuntimeRequest, RuntimeResponse } from "../../runtime-core/src/index";
import type { TokenSource } from "../../../packages/runtime/openbuddy-hermes-client/src/transport";
import { RemoteHermesAdapter } from "../../../electron/main/runtime/remote-hermes-adapter";
import type { Scope } from "../../../packages/runtime/openbuddy-runtime-adapter/src/types";
import { capabilityList, collectChat } from "./session-chat";

export const DEFAULT_HERMES_ENDPOINT = "http://127.0.0.1:8642";

export interface HermesAdapterOptions {
  endpoint?: string;
  tokens: TokenSource;
  scope?: Scope;
  fetchImpl?: typeof fetch;
  log?: (line: string) => void;
}

export class HermesAdapter implements RuntimeAdapter {
  readonly id = "hermes";
  readonly name = "Hermes Agent";
  readonly type = "local_process" as const;
  readonly endpoint: string;
  private readonly engine: RemoteHermesAdapter;
  private readonly scope: Scope;

  constructor(options: HermesAdapterOptions) {
    this.endpoint = options.endpoint ?? DEFAULT_HERMES_ENDPOINT;
    this.scope = options.scope ?? { tenantId: "local", workspaceId: "desktop", actorId: "desktop" };
    this.engine = new RemoteHermesAdapter({
      endpoint: this.endpoint,
      tokens: options.tokens,
      log: options.log ?? (() => undefined),
      fetchImpl: options.fetchImpl,
      pollIntervalMs: 20,
    });
  }

  async start(): Promise<void> {
    await this.engine.connect({ endpointRef: this.endpoint, credentialRef: "", scope: this.scope });
  }

  async stop(): Promise<void> {
    await this.engine.disconnect();
  }

  async health(): Promise<RuntimeHealth> {
    try {
      const caps = await this.engine.connect({ endpointRef: this.endpoint, credentialRef: "", scope: this.scope });
      return { status: "healthy", version: caps.protocolVersion, endpoint: this.endpoint };
    } catch (error) {
      return {
        status: "unhealthy",
        version: "unknown",
        endpoint: this.endpoint,
        message: error instanceof Error ? error.message : "unhealthy",
      };
    }
  }

  chat(request: RuntimeRequest): Promise<RuntimeResponse> {
    return collectChat(this.engine, this.scope, "hermes-desktop", this.endpoint, request);
  }

  async listCapabilities(): Promise<Capability[]> {
    const caps = await this.engine.connect({ endpointRef: this.endpoint, credentialRef: "", scope: this.scope });
    return capabilityList(caps.features);
  }
}
