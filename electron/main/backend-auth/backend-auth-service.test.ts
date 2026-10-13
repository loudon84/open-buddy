import { createServer } from "node:http";
import { afterEach, describe, expect, it, vi } from "vitest";
import { shell } from "electron";
import { BackendAuthService, DEFAULT_BACKEND_ORIGIN, type BackendAuthDeps } from "./backend-auth-service";

vi.mock("electron", () => ({
  app: { getPath: () => "/tmp/openbuddy-backend-auth-test" },
  safeStorage: { isEncryptionAvailable: () => true, encryptString: (value: string) => Buffer.from(value), decryptString: (value: Buffer) => value.toString() },
  shell: { openExternal: vi.fn() },
  session: { fromPartition: () => ({ clearStorageData: async () => undefined }) },
  BrowserWindow: class {},
}));

type Memory = { origin: string; cipher: string | null };

function memory(): Memory {
  return { origin: "", cipher: null };
}

async function fakeBackend(handler: (path: string, body: unknown, authorization: string | undefined) => { status: number; json: unknown }): Promise<{ origin: string; close(): Promise<void> }> {
  const server = createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => {
      const raw = Buffer.concat(chunks).toString("utf8");
      const body = raw ? JSON.parse(raw) as unknown : {};
      const result = handler(req.url ?? "/", body, req.headers.authorization);
      res.writeHead(result.status, { "Content-Type": "application/json" });
      res.end(JSON.stringify(result.json));
    });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 0;
  return { origin: `http://127.0.0.1:${port}`, close: () => new Promise((resolve) => server.close(() => resolve())) };
}

function service(store: Memory, extra: BackendAuthDeps = {}): BackendAuthService {
  return new BackendAuthService({
    encryptionAvailable: () => true,
    encrypt: (plain) => plain,
    decrypt: (cipher) => cipher,
    loadOrigin: () => store.origin,
    saveOriginValue: (origin) => { store.origin = origin; },
    loadCipher: () => store.cipher,
    saveCipher: (cipher) => { store.cipher = cipher; },
    clearOAuthPartition: async () => undefined,
    openAuthWindow: async () => undefined,
    ...extra,
  });
}

const closers: Array<() => Promise<void>> = [];
afterEach(async () => {
  await Promise.all(closers.splice(0).map((close) => close()));
});

describe("BackendAuthService session", () => {
  it("stays signed out until startup refresh succeeds", async () => {
    const backend = await fakeBackend((path) => {
      if (path === "/api/v1/auth/refresh") {
        return { status: 200, json: { data: { access_token: "next", refresh_token: "r2", expires_in: 3600, user: { name: "Ada", must_change_password: false } } } };
      }
      return { status: 404, json: {} };
    });
    closers.push(backend.close);
    const store = memory();
    store.origin = backend.origin;
    const seen: string[] = [];
    const auth = service(store, {
      fetchImpl: fetch,
      now: () => 1_000,
    });
    auth.setStatusListener((view) => seen.push(view.status));
    store.cipher = JSON.stringify({
      accessToken: "old", refreshToken: "r1", expiresAt: 2_000, needsOrgSetup: false, user: { name: "Ada", mustChangePassword: false },
    });
    const view = await auth.init();
    expect(seen[0]).toBe("signed_out");
    expect(view.status).toBe("signed_in");
    expect(view.displayName).toBe("Ada");
    expect(store.cipher).toContain("next");
  });

  it("clears the session when refresh fails", async () => {
    const backend = await fakeBackend(() => ({ status: 400, json: { message: "登录已失效，请重新发起登录" } }));
    closers.push(backend.close);
    const store = memory();
    store.origin = backend.origin;
    store.cipher = JSON.stringify({
      accessToken: "old", refreshToken: "r1", expiresAt: 2_000, needsOrgSetup: false, user: { name: "Ada", mustChangePassword: false },
    });
    const auth = service(store, { fetchImpl: fetch });
    const view = await auth.init();
    expect(view.status).toBe("signed_out");
    expect(view.displayName).toBeUndefined();
    expect(store.cipher).toBeNull();
  });

  it("logs out the previous origin before saving a new one", async () => {
    const hits: string[] = [];
    const backend = await fakeBackend((path, _body, authorization) => {
      hits.push(`${path} ${authorization ?? ""}`);
      return { status: 200, json: { message: "已登出" } };
    });
    closers.push(backend.close);
    const store = memory();
    store.origin = backend.origin;
    store.cipher = JSON.stringify({
      accessToken: "tok", refreshToken: "r1", expiresAt: Date.now() + 86_400_000, needsOrgSetup: false, user: { name: "Ada", mustChangePassword: false },
    });
    const auth = service(store, { fetchImpl: fetch });
    await auth.init();
    const saved = await auth.saveOrigin("https://id.example");
    expect(saved).toEqual({ ok: true, origin: "https://id.example" });
    expect(hits.some((hit) => hit.includes("/api/v1/auth/logout") && hit.includes("Bearer tok"))).toBe(true);
    expect(store.cipher).toBeNull();
    expect(auth.status().status).toBe("signed_out");
  });

  it("does not replace a saved origin with an illegal one", async () => {
    const store = memory();
    store.origin = "https://id.example";
    const auth = service(store);
    await auth.init();
    const saved = await auth.saveOrigin("http://8.8.8.8/api");
    expect(saved.ok).toBe(false);
    expect(store.origin).toBe("https://id.example");
  });
});

describe("BackendAuthService origin default", () => {
  it("writes the enterprise default only when the config document is missing", async () => {
    let stored: string | undefined;
    const auth = new BackendAuthService({
      loadOrigin: () => stored,
      saveOriginValue: (origin) => { stored = origin; },
      encryptionAvailable: () => true,
    });
    const view = await auth.init();
    expect(stored).toBe(DEFAULT_BACKEND_ORIGIN);
    expect(view.origin).toBe(DEFAULT_BACKEND_ORIGIN);

    const empty = new BackendAuthService({
      loadOrigin: () => "",
      saveOriginValue: () => { throw new Error("explicit empty must not be rewritten"); },
    });
    expect((await empty.init()).origin).toBe("");
  });

  it("keeps an explicit empty origin across a later init", async () => {
    const store = memory();
    const auth = service(store);
    expect(await auth.saveOrigin("")).toEqual({ ok: true, origin: "" });
    expect(store.origin).toBe("");
    const again = service(store);
    expect((await again.init()).origin).toBe("");
    expect(store.origin).toBe("");
  });
});

describe("BackendAuthService login round", () => {
  it("exchanges a lone code and ignores a late response after cancel", async () => {
    let release: (value: Response) => void = () => undefined;
    const gate = new Promise<Response>((resolve) => { release = resolve; });
    const opened: string[] = [];
    const backend = await fakeBackend(() => ({ status: 200, json: { data: { access_token: "a", refresh_token: "r", expires_in: 3600, needs_org_setup: true, user: { name: "Ada", must_change_password: true } } } }));
    closers.push(backend.close);
    const store = memory();
    const auth = service(store, {
      fetchImpl: (input, init) => {
        if (String(input).endsWith("/exchange")) return gate;
        return fetch(input, init);
      },
      openAuthWindow: async ({ url }) => { opened.push(url); },
    });
    await auth.saveOrigin(backend.origin);
    const started = await auth.login();
    expect(started).toEqual({ ok: true });
    const login = new URL(opened[0]);
    const returnTo = login.searchParams.get("return_to") ?? "";
    expect(returnTo).toMatch(/^http:\/\/127\.0\.0\.1:\d+\/callback$/);
    const callback = await fetch(`${returnTo}?code=once`);
    expect(await callback.text()).toContain("可以关闭此页面");
    expect(callback.headers.get("cache-control")).toBe("no-store");
    expect(auth.status().phase).toBe("exchanging");
    auth.cancel();
    release(new Response(JSON.stringify({ data: { access_token: "a", refresh_token: "r", expires_in: 3600, user: { name: "Ada", must_change_password: false } } }), { status: 200 }));
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(auth.status().status).toBe("signed_out");
    expect(store.cipher).toBeNull();
  });

  it("maps an error code and does not exchange", async () => {
    const posts: string[] = [];
    const urls: string[] = [];
    const store = memory();
    const auth = service(store, {
      openAuthWindow: async ({ url }) => { urls.push(url); },
      fetchImpl: async (input, init) => {
        posts.push(String(input));
        return fetch(input, init);
      },
    });
    await auth.saveOrigin("https://id.example");
    await auth.login();
    const callback = new URL(urls[0]).searchParams.get("return_to") ?? "";
    await fetch(`${callback}?error=member_not_found&code=also`);
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(auth.status().error).toContain("没有匹配的可用成员");
    expect(posts.some((item) => item.includes("exchange"))).toBe(false);
  });

  it("reports browser, encryption, and timeout failures", async () => {
    const store = memory();
    const locked = service(store, { encryptionAvailable: () => false });
    await locked.saveOrigin("https://id.example");
    expect(await locked.login()).toEqual({ ok: false, error: "系统加密不可用，无法登录。" });

    const browser = service(store, { openAuthWindow: async () => { throw new Error("no window"); } });
    await browser.saveOrigin("https://id.example");
    expect(await browser.login()).toEqual({ ok: false, error: "无法打开授权窗口。" });

    const urls: string[] = [];
    const slow = service(store, { roundTimeoutMs: 20, openAuthWindow: async ({ url }) => { urls.push(url); } });
    await slow.saveOrigin("https://id.example");
    await slow.login();
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(slow.status().error).toBe("登录已超时，请重新登录。");
  });

  it("does not open the system browser, and closing after the callback does not cancel the round", async () => {
    let release: (value: Response) => void = () => undefined;
    const gate = new Promise<Response>((resolve) => { release = resolve; });
    const store = memory();
    let closeHook: (() => void) | undefined;
    const auth = service(store, {
      fetchImpl: (input, init) => {
        if (String(input).endsWith("/exchange")) return gate;
        return fetch(input, init);
      },
      openAuthWindow: async ({ url, onConsumed, onClosedBeforeConsume }) => {
        closeHook = onClosedBeforeConsume;
        onConsumed(new URL(`${new URL(url).searchParams.get("return_to")}?code=once`));
      },
    });
    await auth.saveOrigin("https://id.example");
    expect(await auth.login()).toEqual({ ok: true });
    expect(shell.openExternal).not.toHaveBeenCalled();
    expect(auth.status().phase).toBe("exchanging");
    closeHook?.();
    release(new Response(JSON.stringify({ data: { access_token: "a", refresh_token: "r", expires_in: 3600, user: { name: "Ada", must_change_password: false } } }), { status: 200 }));
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(auth.status().status).toBe("signed_in");
  });

  it("cancels the round when the auth window closes before the callback is consumed", async () => {
    const store = memory();
    let closeHook: (() => void) | undefined;
    const auth = service(store, {
      openAuthWindow: async ({ onClosedBeforeConsume }) => { closeHook = onClosedBeforeConsume; },
    });
    await auth.saveOrigin("https://id.example");
    await auth.login();
    closeHook?.();
    expect(auth.status().phase).toBe("idle");
    expect(auth.status().status).toBe("signed_out");
  });
});

describe("BackendAuthService partition and probe", () => {
  it("clears the oauth partition on logout and origin change, but not when refresh fails", async () => {
    const clears: string[] = [];
    const backend = await fakeBackend(() => ({ status: 400, json: { message: "登录已失效，请重新发起登录" } }));
    closers.push(backend.close);
    const store = memory();
    store.origin = backend.origin;
    store.cipher = JSON.stringify({
      accessToken: "tok", refreshToken: "r1", expiresAt: Date.now() + 86_400_000, needsOrgSetup: false, user: { name: "Ada", mustChangePassword: false },
    });
    const auth = service(store, {
      fetchImpl: fetch,
      clearOAuthPartition: async () => { clears.push("clear"); },
    });
    await auth.init();
    expect(clears).toEqual([]);
    await auth.logout();
    expect(clears).toEqual(["clear"]);
    await auth.saveOrigin("https://id.example");
    expect(clears).toEqual(["clear", "clear"]);
    await auth.saveOrigin("https://id.example");
    expect(clears).toEqual(["clear", "clear"]);
  });

  it("probes the login endpoint without following redirects", async () => {
    const hits: string[] = [];
    const auth = service(memory(), {
      fetchImpl: async (input, init) => {
        hits.push(String(input));
        expect(init?.redirect).toBe("manual");
        return new Response(null, { status: 302 });
      },
    });
    expect(await auth.testConnection("https://id.example")).toEqual({ ok: true });
    expect(hits[0]).toContain("/api/v1/auth/casdoor/login?return_to=");
    expect(await auth.testConnection("http://8.8.8.8/api")).toEqual({ ok: false, error: "根地址无效" });
    expect(hits).toHaveLength(1);
  });

  it("reports a failed probe for a client error and a timeout", async () => {
    const auth = service(memory(), {
      fetchImpl: async () => new Response(null, { status: 404 }),
    });
    expect(await auth.testConnection("https://id.example")).toEqual({ ok: false, error: "连接失败" });
    const slow = service(memory(), {
      testConnectionTimeoutMs: 20,
      fetchImpl: (_input, init) => new Promise((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject(new Error("aborted")));
      }),
    });
    expect(await slow.testConnection("https://id.example")).toEqual({ ok: false, error: "连接失败" });
  });
});
