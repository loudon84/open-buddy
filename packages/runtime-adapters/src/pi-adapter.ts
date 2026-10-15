import type { Capability, RuntimeAdapter, RuntimeHealth, RuntimeRequest, RuntimeResponse } from "../../runtime-core/src/index";
import { LocalPiAdapter, type LocalPiPort } from "../../../electron/main/runtime/local-pi-adapter";
import type { Scope } from "../../../packages/runtime/openbuddy-runtime-adapter/src/types";
import { capabilityList, collectChat } from "./session-chat";

export const PI_ENDPOINT = "embedded://pi";

export class PiAdapter implements RuntimeAdapter {
  readonly id = "pi";
  readonly name = "Pi Runtime";
  readonly type = "embedded" as const;
  private readonly engine: LocalPiAdapter;
  private readonly scope: Scope;

  constructor(private readonly port: LocalPiPort & { installationId: string }) {
    this.engine = new LocalPiAdapter(port);
    this.scope = {
      tenantId: `local:${port.installationId}`,
      workspaceId: "local",
      actorId: "local",
    };
  }

  async start(): Promise<void> {
    await this.engine.connect({ endpointRef: PI_ENDPOINT, credentialRef: "", scope: this.scope });
  }

  async stop(): Promise<void> {
    await this.engine.disconnect();
  }

  async health(): Promise<RuntimeHealth> {
    try {
      if (!this.port.installationId) throw new Error("pi port is unavailable");
      if (this.port.bound === false) throw new Error("pi port is not bound");
      await this.engine.connect({ endpointRef: PI_ENDPOINT, credentialRef: "", scope: this.scope });
      return { status: "healthy", version: "embedded", endpoint: PI_ENDPOINT };
    } catch (error) {
      return {
        status: "unhealthy",
        version: "embedded",
        endpoint: PI_ENDPOINT,
        message: error instanceof Error ? error.message : "unhealthy",
      };
    }
  }

  chat(request: RuntimeRequest): Promise<RuntimeResponse> {
    return collectChat(this.engine, this.scope, "embedded-session", PI_ENDPOINT, request);
  }

  async listCapabilities(): Promise<Capability[]> {
    const caps = await this.engine.connect({ endpointRef: PI_ENDPOINT, credentialRef: "", scope: this.scope });
    return capabilityList(caps.features);
  }
}
