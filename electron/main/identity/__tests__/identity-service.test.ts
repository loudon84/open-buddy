import { describe, expect, it, vi } from "vitest";
import type { IdentityCacheEnvelope, IdentityContext } from "@openbuddy/shared-types";
import { IdentityService, type IdentityAuditInput, type IdentityAuth } from "../identity-service";

vi.mock("electron", () => ({
  app: { getPath: () => "/tmp/openbuddy-identity-test" },
}));

const context: IdentityContext = {
  user: { id: "user-1", name: "Ada" },
  tenant: { id: "tenant-1", name: "ACME" },
  roles: ["sales_manager"],
  permissions: ["agent.crm.read"],
  policies: { agents: ["pi"] },
};

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

function harness(options: {
  body?: unknown;
  status?: number;
  failNetwork?: boolean;
  auth?: IdentityAuth | null;
  stored?: unknown;
  now?: number;
} = {}) {
  const audits: IdentityAuditInput[] = [];
  let stored = options.stored ?? null;
  const refreshAuth = vi.fn(async () => undefined);
  const service = new IdentityService({
    now: () => options.now ?? Date.parse("2026-10-13T12:00:00.000Z"),
    getAuth: () => (options.auth === undefined ? { origin: "https://id.example", accessToken: "tok" } : options.auth),
    refreshAuth,
    loadEnvelope: () => stored,
    saveEnvelope: (envelope) => { stored = envelope; },
    recordAudit: (event) => { audits.push(event); },
    fetchImpl: (async () => {
      if (options.failNetwork) throw new Error("offline");
      return jsonResponse(options.status ?? 200, options.body ?? { ...context, expiresAt: "2026-10-13T12:20:00.000Z" });
    }) as typeof fetch,
  });
  return { service, audits, refreshAuth, read: () => stored };
}

describe("IdentityService", () => {
  it("stores an envelope and clamps a missing expiry to 15 minutes", async () => {
    const { service, read, audits } = harness({ body: context });
    const result = await service.refresh();
    expect(result.ok).toBe(true);
    const stored = read() as IdentityCacheEnvelope;
    expect(stored.contextVersion).toBe("v1");
    expect(stored.identityContext).toEqual(context);
    expect(stored.expiresAt).toBe("2026-10-13T12:15:00.000Z");
    expect(audits[0]?.event).toBe("identity.context.fetch");
    expect(audits[0]?.outcome).toBe("success");
    expect(audits[0]?.detail).toContain("durationMs");
  });

  it("clamps an expiry outside 1 minute to 1 hour", async () => {
    const { service, read } = harness({ body: { ...context, expiresAt: "2026-10-14T12:00:00.000Z" } });
    await service.refresh();
    expect((read() as IdentityCacheEnvelope).expiresAt).toBe("2026-10-13T13:00:00.000Z");
  });

  it("drops a mismatched cache version and fetches again", async () => {
    const { service, read } = harness({ stored: { contextVersion: "v0", identityContext: context, expiresAt: "2026-10-13T12:10:00.000Z" } });
    await service.refresh();
    expect((read() as IdentityCacheEnvelope).contextVersion).toBe("v1");
  });

  it("keeps the old cache when the network fails", async () => {
    const cached: IdentityCacheEnvelope = {
      contextVersion: "v1",
      expiresAt: "2026-10-13T12:10:00.000Z",
      lastRefreshedAt: "2026-10-13T11:00:00.000Z",
      identityContext: context,
    };
    const { service } = harness({ stored: cached, failNetwork: true });
    const result = await service.refresh();
    expect(result).toEqual({ ok: false, error: "身份上下文暂不可用，部分功能受限" });
    expect(service.current()).toEqual(context);
    expect(service.lastError).toBe("身份上下文暂不可用，部分功能受限");
  });

  it("refreshes the token once on 401 and clears the cache if that also fails", async () => {
    let calls = 0;
    const refreshAuth = vi.fn(async () => undefined);
    const audits: IdentityAuditInput[] = [];
    let stored: unknown = {
      contextVersion: "v1",
      expiresAt: "2026-10-13T12:10:00.000Z",
      lastRefreshedAt: "2026-10-13T11:00:00.000Z",
      identityContext: context,
    };
    const service = new IdentityService({
      now: () => Date.parse("2026-10-13T12:00:00.000Z"),
      getAuth: () => ({ origin: "https://id.example", accessToken: "tok" }),
      refreshAuth,
      loadEnvelope: () => stored,
      saveEnvelope: (envelope) => { stored = envelope; },
      recordAudit: (event) => { audits.push(event); },
      fetchImpl: (async () => {
        calls += 1;
        return jsonResponse(401, { code: "IDENTITY_CONTEXT_001" });
      }) as typeof fetch,
    });
    const result = await service.refresh();
    expect(refreshAuth).toHaveBeenCalledTimes(1);
    expect(calls).toBe(2);
    expect(result).toEqual({ ok: false, error: "登录已过期，请重新登录" });
    expect(stored).toBeNull();
    expect(audits.some((event) => event.event === "identity.context.clear" && event.detail === JSON.stringify({ reason: "expired" }))).toBe(true);
    expect(audits.some((event) => event.event === "identity.context.fetch" && event.outcome === "failure" && event.reason === "登录已过期，请重新登录")).toBe(true);
  });

  it("keeps the login and the cache on 403", async () => {
    const { service } = harness({ status: 403, body: { code: "IDENTITY_CONTEXT_003" }, stored: {
      contextVersion: "v1", expiresAt: "2026-10-13T12:10:00.000Z", lastRefreshedAt: "", identityContext: context,
    } });
    const result = await service.refresh();
    expect(result).toEqual({ ok: false, error: "当前账号无权限访问企业资源" });
    expect(service.current()).toEqual(context);
  });

  it("returns null when signed out and nothing is cached", () => {
    const { service } = harness({ auth: null });
    expect(service.current()).toBeNull();
  });

  it("audits a clear with the user and tenant", async () => {
    const { service, audits, read } = harness({ stored: {
      contextVersion: "v1", expiresAt: "2026-10-13T12:10:00.000Z", lastRefreshedAt: "", identityContext: context,
    } });
    await service.clear("logout");
    expect(read()).toBeNull();
    expect(audits[0]).toMatchObject({
      event: "identity.context.clear",
      outcome: "success",
      subject: "user-1",
      tenantId: "tenant-1",
      detail: JSON.stringify({ reason: "logout" }),
    });
  });
});
