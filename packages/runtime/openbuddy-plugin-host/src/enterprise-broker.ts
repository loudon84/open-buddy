export class BrokerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BrokerError";
  }
}

export interface RegisteredTool {
  call(input: { tenantId: string; permission: string; signal?: { aborted: boolean } }): { ok: true };
  dispose(): void;
}

/**
 * A manifest permission list is not a grant. Call time checks the grant and the resource ACL again.
 * This broker does not open a Hermes connection.
 */
export class EnterpriseBroker {
  private readonly tools = new Map<string, { disposed: boolean; inflight: number }>();
  private readonly allowedMcpHosts: string[];

  constructor(allowedMcpHosts: string[]) {
    this.allowedMcpHosts = allowedMcpHosts;
  }

  register(input: {
    id: string;
    permission: string;
    manifestPermissions: string[];
    grants: string[];
    resourceAcl: string[];
    tenantId: string;
  }): RegisteredTool {
    if (!input.grants.includes(input.permission) || !input.resourceAcl.includes(input.permission)) {
      throw new BrokerError("permission is not granted");
    }
    if (input.manifestPermissions.includes(input.permission) && input.grants.length === 0) {
      throw new BrokerError("manifest list is not a grant");
    }
    const state = { disposed: false, inflight: 0 };
    this.tools.set(input.id, state);
    return {
      call: (call) => {
        if (state.disposed) throw new BrokerError("disposed");
        if (call.tenantId !== input.tenantId) throw new BrokerError("fake scope");
        if (call.permission === "token") throw new BrokerError("token request denied");
        if (!input.grants.includes(input.permission) || !input.resourceAcl.includes(input.permission)) {
          throw new BrokerError("permission revoked");
        }
        state.inflight += 1;
        try {
          if (call.signal?.aborted) throw new BrokerError("cancelled");
          return { ok: true as const };
        } finally {
          state.inflight -= 1;
        }
      },
      dispose: () => {
        state.disposed = true;
        this.tools.delete(input.id);
      },
    };
  }

  connectMcp(url: string): void {
    const host = new URL(url).host;
    if (host.includes("hermes")) throw new BrokerError("direct hermes connection denied");
    if (!this.allowedMcpHosts.includes(host)) throw new BrokerError("mcp url denied");
  }

  inflight(id: string): number {
    return this.tools.get(id)?.inflight ?? 0;
  }
}
