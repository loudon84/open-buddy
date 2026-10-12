import { HermesClient, type HermesClientOptions } from "../../../packages/runtime/openbuddy-hermes-client/src/client.ts";

/**
 * Main-process adapter. The access token stays in the TokenSource owned by main.
 * This file does not import Electron APIs; the host passes the token source in.
 */
export class RemoteHermesAdapter {
  readonly client: HermesClient;

  constructor(options: HermesClientOptions) {
    this.client = new HermesClient(options);
  }

  connect(): Promise<{ protocolVersion: string; kind: "remote-hermes" }> {
    return this.client.connect();
  }
}
