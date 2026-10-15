import { assertCompatibleProtocol } from "./protocol";
import { HermesTransport, type TokenSource } from "./transport";

export interface HermesClientOptions {
  endpoint: string;
  tokens: TokenSource;
  log: (line: string) => void;
  sleep?: (ms: number) => Promise<void>;
  fetchImpl?: typeof fetch;
}

export class HermesClient {
  readonly transport: HermesTransport;

  constructor(options: HermesClientOptions) {
    this.transport = new HermesTransport(options);
  }

  async connect(): Promise<{ protocolVersion: string; kind: "remote-hermes"; features: Record<string, boolean> }> {
    const response = await this.transport.request("/v1/capabilities");
    if (!response.ok) {
      throw new Error(`capabilities failed: ${response.status}`);
    }
    const body = await response.json() as { protocolVersion: string; features?: Record<string, unknown> };
    assertCompatibleProtocol(body.protocolVersion);
    const keys = ["resume", "cancel", "approvals", "tools", "tasks", "artifacts", "attachments", "steer", "followUp", "modelSwitch", "liveStream"];
    const features: Record<string, boolean> = {};
    for (const key of keys) features[key] = body.features?.[key] === true;
    return { protocolVersion: body.protocolVersion, kind: "remote-hermes", features };
  }
}
