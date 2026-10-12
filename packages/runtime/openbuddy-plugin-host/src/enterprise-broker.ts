export class BrokerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BrokerError";
  }
}

export interface CallerScope {
  tenantId: string;
  workspaceId: string;
  actorId: string;
}

export interface ToolContext extends CallerScope {
  signal: AbortSignal;
}

export type ToolHandler = (input: unknown, context: ToolContext) => Promise<unknown>;

export interface ToolResult {
  ok: true;
  value: unknown;
}

export interface RegisteredTool {
  call(input: { scope: CallerScope; input: unknown; signal?: AbortSignal }): Promise<ToolResult>;
  dispose(): void;
}

/** Current grants for a caller, read on every call so a revoke takes effect immediately. */
export type GrantSource = (scope: CallerScope) => string[];

/**
 * A manifest permission list is not a grant. Registration and every call check the caller's
 * current grant and the resource ACL for the permission the tool was registered with.
 * This broker does not open a Hermes connection.
 */
export class EnterpriseBroker {
  private readonly tools = new Map<string, { disposed: boolean; inflight: number }>();

  constructor(
    private readonly allowedMcpHosts: string[],
    private readonly grants: GrantSource,
    private readonly timeoutMs = 30_000,
  ) {}

  register(input: {
    id: string;
    permission: string;
    manifestPermissions: string[];
    resourceAcl: string[];
    owner: CallerScope;
    handler: ToolHandler;
  }): RegisteredTool {
    if (!input.manifestPermissions.includes(input.permission)) throw new BrokerError("permission is not declared");
    this.authorize(input.owner, input.permission, input.resourceAcl, "permission is not granted");
    const state = { disposed: false, inflight: 0 };
    this.tools.set(input.id, state);
    return {
      call: async (call) => {
        if (state.disposed) throw new BrokerError("disposed");
        if (call.scope.tenantId !== input.owner.tenantId || call.scope.workspaceId !== input.owner.workspaceId) {
          throw new BrokerError("fake scope");
        }
        this.authorize(call.scope, input.permission, input.resourceAcl, "permission revoked");
        if (call.signal?.aborted) throw new BrokerError("cancelled");
        const controller = new AbortController();
        const onAbort = () => controller.abort(new BrokerError("cancelled"));
        call.signal?.addEventListener("abort", onAbort, { once: true });
        const timer = setTimeout(() => controller.abort(new BrokerError("timed out")), this.timeoutMs);
        state.inflight += 1;
        try {
          const aborted = new Promise<never>((_, reject) => {
            controller.signal.addEventListener("abort", () => reject(controller.signal.reason), { once: true });
          });
          const value = await Promise.race([input.handler(call.input, { ...call.scope, signal: controller.signal }), aborted]);
          return { ok: true, value };
        } finally {
          clearTimeout(timer);
          call.signal?.removeEventListener("abort", onAbort);
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

  private authorize(scope: CallerScope, permission: string, resourceAcl: string[], message: string): void {
    if (!this.grants(scope).includes(permission) || !resourceAcl.includes(permission)) throw new BrokerError(message);
  }
}
