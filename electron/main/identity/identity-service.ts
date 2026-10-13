import { app } from "electron";
import { join } from "node:path";
import { openStorageSync, SettingsDocumentStore } from "@openbuddy/storage";
import {
  parseIdentityContext,
  type IdentityCacheEnvelope,
  type IdentityContext,
} from "@openbuddy/shared-types";
import { IDENTITY_FORBIDDEN_TEXT, IDENTITY_UNAVAILABLE_TEXT, identityErrorText } from "./error-copy";

const CACHE_NAMESPACE = "identity:context";
const STORAGE_APP_VERSION = "openbuddy-identity";
const MIN_TTL_MS = 60_000;
const MAX_TTL_MS = 60 * 60_000;
const DEFAULT_TTL_MS = 15 * 60_000;

export type IdentityClearReason = "logout" | "origin_change" | "expired";

export type IdentityAuth = { origin: string; accessToken: string };

export type IdentityAuditInput = {
  event: string;
  outcome: "success" | "failure";
  subject?: string;
  tenantId?: string;
  reason?: string;
  detail?: string;
};

export type IdentityDeps = {
  fetchImpl?: typeof fetch;
  now?: () => number;
  loadEnvelope?: () => unknown;
  saveEnvelope?: (envelope: IdentityCacheEnvelope | null) => void;
  recordAudit?: (event: IdentityAuditInput) => void | Promise<void>;
  getAuth?: () => IdentityAuth | null;
  refreshAuth?: () => Promise<unknown>;
};

export type IdentitySummary = {
  tenant?: { id: string; name: string };
  stale: boolean;
};

let settingsStore: SettingsDocumentStore | undefined;

function store(): SettingsDocumentStore {
  if (!settingsStore) {
    const opened = openStorageSync({ filePath: join(app.getPath("userData"), "openbuddy.sqlite"), appVersion: STORAGE_APP_VERSION });
    settingsStore = new SettingsDocumentStore(opened.driver);
  }
  return settingsStore;
}

function readEnvelopeFromStore(): unknown {
  return store().get(CACHE_NAMESPACE) ?? null;
}

function writeEnvelopeToStore(envelope: IdentityCacheEnvelope | null): void {
  if (!envelope) store().delete(CACHE_NAMESPACE);
  else store().set(CACHE_NAMESPACE, envelope as unknown as Record<string, unknown>);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? value as Record<string, unknown> : null;
}

function clampExpiry(raw: string | undefined, now: number): string {
  const parsed = raw ? Date.parse(raw) : Number.NaN;
  const target = Number.isFinite(parsed) ? parsed : now + DEFAULT_TTL_MS;
  return new Date(Math.min(now + MAX_TTL_MS, Math.max(now + MIN_TTL_MS, target))).toISOString();
}

function normalizeEnvelope(value: unknown): IdentityCacheEnvelope | "mismatch" | null {
  const record = asRecord(value);
  if (!record) return null;
  if (record.contextVersion !== "v1") return "mismatch";
  const identityContext = parseIdentityContext(record.identityContext);
  if (!identityContext || typeof record.expiresAt !== "string") return null;
  return {
    contextVersion: "v1",
    expiresAt: record.expiresAt,
    lastRefreshedAt: typeof record.lastRefreshedAt === "string" ? record.lastRefreshedAt : "",
    identityContext,
  };
}

export class IdentityService {
  lastError: string | undefined;
  private envelope: IdentityCacheEnvelope | null = null;
  private loaded = false;
  private inflight: Promise<{ ok: true; context: IdentityContext } | { ok: false; error: string }> | null = null;

  constructor(private readonly deps: IdentityDeps = {}) {}

  current(): IdentityContext | null {
    this.ensureLoaded();
    return this.envelope?.identityContext ?? null;
  }

  summary(): IdentitySummary {
    const context = this.current();
    if (!context || !this.envelope) return { stale: false };
    const stale = Date.parse(this.envelope.expiresAt) <= this.now() || Boolean(this.lastError);
    return { tenant: { id: context.tenant.id, name: context.tenant.name }, stale };
  }

  /** Agent calls keep the cached context and refresh in the background once it expires. */
  contextForPrompt(): IdentityContext | null {
    const context = this.current();
    if (context && this.envelope && Date.parse(this.envelope.expiresAt) <= this.now()) {
      void this.refresh();
    }
    return context;
  }

  async refresh(): Promise<{ ok: true; context: IdentityContext } | { ok: false; error: string }> {
    if (this.inflight) return this.inflight;
    this.inflight = this.fetchContext(false).finally(() => { this.inflight = null; });
    return this.inflight;
  }

  async clear(reason: IdentityClearReason): Promise<void> {
    this.ensureLoaded();
    const context = this.envelope?.identityContext;
    this.envelope = null;
    this.lastError = undefined;
    this.persist(null);
    if (!context) return;
    await this.audit({
      event: "identity.context.clear",
      outcome: "success",
      subject: context.user.id,
      tenantId: context.tenant.id,
      detail: JSON.stringify({ reason }),
    });
  }

  attachBackendAuth(auth: {
    setIdentityListener(listener: { onSignedIn(): void; onSignedOut(reason: IdentityClearReason): void } | null): void;
    setIdentitySummary(provider: (() => IdentitySummary) | null): void;
    identityAuth(): IdentityAuth | null;
    refresh(): Promise<unknown>;
  }): void {
    this.deps.getAuth = () => auth.identityAuth();
    this.deps.refreshAuth = () => auth.refresh();
    this.deps.recordAudit ??= (event) => recordIdentityAudit(event);
    auth.setIdentityListener({
      onSignedIn: () => { void this.refresh(); },
      onSignedOut: (reason) => { void this.clear(reason); },
    });
    auth.setIdentitySummary(() => this.summary());
  }

  private async fetchContext(retried: boolean): Promise<{ ok: true; context: IdentityContext } | { ok: false; error: string }> {
    this.ensureLoaded();
    const auth = this.deps.getAuth?.() ?? null;
    if (!auth?.origin || !auth.accessToken) return { ok: false, error: "未登录" };
    const started = this.now();
    let response: Response;
    try {
      response = await this.fetchImpl(`${auth.origin}/api/v1/identity/context`, {
        method: "GET",
        headers: { Authorization: `Bearer ${auth.accessToken}` },
      });
    } catch {
      return this.failSoft(started, IDENTITY_UNAVAILABLE_TEXT);
    }
    if (response.status === 401) {
      if (!retried) {
        await this.deps.refreshAuth?.();
        return this.fetchContext(true);
      }
      await this.clear("expired");
      this.lastError = identityErrorText("IDENTITY_CONTEXT_001");
      await this.audit({
        event: "identity.context.fetch",
        outcome: "failure",
        reason: this.lastError,
        detail: JSON.stringify({ error: this.lastError, durationMs: this.now() - started }),
      });
      return { ok: false, error: this.lastError };
    }
    const payload = await response.json().catch(() => ({})) as unknown;
    const record = asRecord(payload);
    const data = asRecord(record?.data) ?? record;
    const code = typeof record?.code === "string" ? record.code : typeof data?.code === "string" ? data.code : undefined;
    if (response.status === 403) {
      this.lastError = IDENTITY_FORBIDDEN_TEXT;
      await this.auditFetch(data, "failure", started, this.lastError);
      return { ok: false, error: this.lastError };
    }
    if (!response.ok) {
      return this.failSoft(started, identityErrorText(code));
    }
    const context = parseIdentityContext(data);
    if (!context) return this.failSoft(started, identityErrorText(code));
    const expiresAt = typeof data?.expiresAt === "string" ? data.expiresAt : typeof record?.expiresAt === "string" ? record.expiresAt : undefined;
    const envelope: IdentityCacheEnvelope = {
      contextVersion: "v1",
      expiresAt: clampExpiry(expiresAt, this.now()),
      lastRefreshedAt: new Date(this.now()).toISOString(),
      identityContext: context,
    };
    this.envelope = envelope;
    this.lastError = undefined;
    this.persist(envelope);
    await this.auditFetch(context, "success", started);
    return { ok: true, context };
  }

  private async failSoft(started: number, message: string): Promise<{ ok: false; error: string }> {
    this.lastError = message;
    const context = this.envelope?.identityContext;
    await this.audit({
      event: "identity.context.fetch",
      outcome: "failure",
      subject: context?.user.id,
      tenantId: context?.tenant.id,
      reason: message,
      detail: JSON.stringify({ error: message, durationMs: this.now() - started }),
    });
    return { ok: false, error: message };
  }

  private async auditFetch(source: unknown, outcome: "success" | "failure", started: number, error?: string): Promise<void> {
    const context = parseIdentityContext(source) ?? this.envelope?.identityContext ?? null;
    await this.audit({
      event: "identity.context.fetch",
      outcome,
      subject: context?.user.id,
      tenantId: context?.tenant.id,
      ...(error ? { reason: error } : {}),
      detail: JSON.stringify({ ...(error ? { error } : {}), durationMs: this.now() - started }),
    });
  }

  private ensureLoaded(): void {
    if (this.loaded) return;
    this.loaded = true;
    const normalized = normalizeEnvelope((this.deps.loadEnvelope ?? readEnvelopeFromStore)());
    if (normalized === "mismatch") {
      this.envelope = null;
      this.persist(null);
      return;
    }
    this.envelope = normalized;
  }

  private persist(envelope: IdentityCacheEnvelope | null): void {
    (this.deps.saveEnvelope ?? writeEnvelopeToStore)(envelope);
  }

  private async audit(event: IdentityAuditInput): Promise<void> {
    await this.deps.recordAudit?.(event);
  }

  private now(): number {
    return (this.deps.now ?? Date.now)();
  }

  private get fetchImpl(): typeof fetch {
    return this.deps.fetchImpl ?? fetch;
  }
}

let instance: IdentityService | undefined;

export const identity: IdentityService = new Proxy({} as IdentityService, {
  get(_target, prop) {
    if (!instance) instance = new IdentityService();
    const value = Reflect.get(instance, prop, instance);
    return typeof value === "function" ? value.bind(instance) : value;
  },
});

/** Test hook: replace the process singleton. */
export function installIdentityService(service: IdentityService): void {
  instance = service;
}

async function recordIdentityAudit(event: IdentityAuditInput): Promise<void> {
  const { casdoorAudit } = await import("../casdoor/casdoor-audit");
  await casdoorAudit.record({
    event: event.event,
    outcome: event.outcome,
    subject: event.subject,
    tenantId: event.tenantId,
    reason: event.reason,
    detail: event.detail,
  });
}
