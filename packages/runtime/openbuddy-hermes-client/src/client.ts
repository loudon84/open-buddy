import { assertCompatibleProtocol } from "./protocol";
import { HermesTransport, type TokenSource } from "./transport";

export interface HermesClientOptions {
  endpoint: string;
  tokens: TokenSource;
  log: (line: string) => void;
  sleep?: (ms: number) => Promise<void>;
}

export class HermesClient {
  readonly transport: HermesTransport;

  constructor(options: HermesClientOptions) {
    this.transport = new HermesTransport(options);
  }

  async connect(): Promise<{ protocolVersion: string; kind: "remote-hermes" }> {
    const response = await this.transport.request("/v1/capabilities");
    if (!response.ok) {
      throw new Error(`capabilities failed: ${response.status}`);
    }
    const body = await response.json() as { protocolVersion: string };
    assertCompatibleProtocol(body.protocolVersion);
    return { protocolVersion: body.protocolVersion, kind: "remote-hermes" };
  }
}
