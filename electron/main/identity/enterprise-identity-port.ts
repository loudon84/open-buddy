import { casdoorAuth } from "../casdoor/casdoor-auth";

export type EnterpriseIdentityChangeReason =
  | "login"
  | "logout"
  | "tenant-switch"
  | "issuer-change"
  | "session-invalidated";

export interface EnterpriseIdentitySnapshot {
  issuer: string;
  subject: string;
  tenantId: string;
  displayName: string;
  epoch: number;
}

export interface EnterpriseIdentityChange {
  reason: EnterpriseIdentityChangeReason;
  snapshot: EnterpriseIdentitySnapshot | null;
}

export class CasdoorIdentityError extends Error {
  constructor(
    readonly code: "UNAUTHENTICATED" | "SESSION_EXPIRED" | "NETWORK" | "NOT_CONFIGURED",
    message: string,
    readonly retryable: boolean,
  ) {
    super(message);
    this.name = "CasdoorIdentityError";
  }
}

type Listener = (change: EnterpriseIdentityChange) => void;

function mapKind(kind: string): EnterpriseIdentityChangeReason | null {
  if (kind === "login") return "login";
  if (kind === "logout") return "logout";
  if (kind === "tenant-switch") return "tenant-switch";
  if (kind === "config-change") return "issuer-change";
  if (kind === "session-invalidated" || kind === "member-revoked" || kind === "login-failed") return "session-invalidated";
  return null;
}

export class CasdoorEnterpriseIdentityPort {
  private readonly listeners = new Set<Listener>();

  constructor() {
    casdoorAuth.addStatusListener((kind) => {
      const reason = mapKind(kind);
      if (!reason) return;
      const snapshot = reason === "logout" || reason === "session-invalidated" ? null : this.current();
      for (const listener of this.listeners) {
        try {
          listener({ reason, snapshot });
        } catch {
          // one subscriber must not break the others
        }
      }
    });
  }

  current(): EnterpriseIdentitySnapshot | null {
    const status = casdoorAuth.status();
    const tenantId = status.tenantContext.activeTenantId;
    if (status.status !== "signed_in" || !status.identity || !tenantId) return null;
    return {
      issuer: casdoorAuth.getConfig().issuer,
      subject: status.identity.subject,
      tenantId,
      displayName: status.identity.displayName || status.identity.subject,
      epoch: casdoorAuth.authEpoch(),
    };
  }

  async getAccessToken(): Promise<string> {
    const status = casdoorAuth.status();
    if (status.status === "configuration_needed") {
      throw new CasdoorIdentityError("NOT_CONFIGURED", status.config.reason ?? "Casdoor 未配置", false);
    }
    const current = casdoorAuth.getAccessToken();
    if (current) return current;
    if (!status.identity && status.status !== "signed_in") {
      await casdoorAuth.refresh();
    } else {
      await casdoorAuth.refresh();
    }
    const refreshed = casdoorAuth.getAccessToken();
    if (refreshed) return refreshed;
    throw new CasdoorIdentityError("UNAUTHENTICATED", "signed out", false);
  }

  refresh(): Promise<string> {
    return this.getAccessToken();
  }

  onChange(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }
}

let port: CasdoorEnterpriseIdentityPort | undefined;

export function enterpriseIdentityPort(): CasdoorEnterpriseIdentityPort {
  port ??= new CasdoorEnterpriseIdentityPort();
  return port;
}
