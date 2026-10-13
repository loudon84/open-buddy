import { app, safeStorage, type BrowserWindow } from "electron";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { join } from "node:path";
import { openStorageSync, SettingsDocumentStore } from "@openbuddy/storage";
import { loginErrorText } from "./error-copy";
import { clearEnterpriseOAuthPartition, openEnterpriseOAuthWindow, type OpenAuthWindowInput } from "./oauth-window";
import { parseBackendOrigin } from "./origin-policy";

export const DEFAULT_BACKEND_ORIGIN = "http://192.168.102.247:4510";
const TEST_CONNECTION_TIMEOUT_MS = 5_000;

const CONFIG_NAMESPACE = "backend-auth:config";
const SESSION_NAMESPACE = "backend-auth:session";
const STORAGE_APP_VERSION = "openbuddy-backend-auth";
const REFRESH_LEAD_MS = 60_000;
const MIN_REFRESH_DELAY_MS = 10_000;
const DEFAULT_ROUND_MS = 10 * 60 * 1000;

export type BackendAuthPhase = "idle" | "waiting_browser" | "exchanging";

export type BackendAuthView = {
  status: "signed_out" | "signed_in" | "error";
  origin: string;
  displayName?: string;
  needsOrgSetup: boolean;
  mustChangePassword: boolean;
  phase: BackendAuthPhase;
  error?: string;
};

type StoredUser = { name: string; mustChangePassword: boolean };

type StoredSession = {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  user: StoredUser;
  needsOrgSetup: boolean;
};

type Listener = { port: number; close(): void };

export type BackendAuthDeps = {
  fetchImpl?: typeof fetch;
  openAuthWindow?: (input: OpenAuthWindowInput) => Promise<{ close(): void } | void>;
  clearOAuthPartition?: () => Promise<void>;
  getParentWindow?: () => BrowserWindow | null;
  now?: () => number;
  roundTimeoutMs?: number;
  testConnectionTimeoutMs?: number;
  encryptionAvailable?: () => boolean;
  encrypt?: (plain: string) => string;
  decrypt?: (cipher: string) => string;
  /** `undefined` means the config document has never been written. */
  loadOrigin?: () => string | undefined;
  saveOriginValue?: (origin: string) => void;
  loadCipher?: () => string | null;
  saveCipher?: (cipher: string | null) => void;
  listen?: (onCallback: (url: URL) => void) => Promise<Listener>;
};

type StatusListener = (view: BackendAuthView) => void;

function page(res: ServerResponse, status: number): void {
  res.writeHead(status, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" });
  res.end("<!doctype html><meta charset=utf-8><p>可以关闭此页面</p>");
}

function defaultListen(onCallback: (url: URL) => void): Promise<Listener> {
  return new Promise((resolve, reject) => {
    const server = createServer((req: IncomingMessage, res: ServerResponse) => {
      const url = new URL(req.url ?? "/", "http://127.0.0.1");
      page(res, url.pathname === "/callback" ? 200 : 404);
      if (url.pathname === "/callback") onCallback(url);
    });
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      resolve({ port, close: () => { server.close(); } });
    });
  });
}

let settingsStore: SettingsDocumentStore | undefined;

function store(): SettingsDocumentStore {
  if (!settingsStore) {
    const opened = openStorageSync({ filePath: join(app.getPath("userData"), "openbuddy.sqlite"), appVersion: STORAGE_APP_VERSION });
    settingsStore = new SettingsDocumentStore(opened.driver);
  }
  return settingsStore;
}

function readOriginFromStore(): string | undefined {
  const stored = store().get(CONFIG_NAMESPACE);
  return stored && typeof stored.origin === "string" ? stored.origin : undefined;
}

function writeOriginToStore(origin: string): void {
  store().set(CONFIG_NAMESPACE, { origin });
}

function readCipherFromStore(): string | null {
  const stored = store().get(SESSION_NAMESPACE);
  return stored && typeof stored.cipher === "string" ? stored.cipher : null;
}

function writeCipherToStore(cipher: string | null): void {
  if (!cipher) store().delete(SESSION_NAMESPACE);
  else store().set(SESSION_NAMESPACE, { cipher });
}

export class BackendAuthService {
  private origin = "";
  private session: StoredSession | null = null;
  private phase: BackendAuthPhase = "idle";
  private error: string | undefined;
  private round = 0;
  private listener: Listener | null = null;
  private roundTimer: ReturnType<typeof setTimeout> | null = null;
  private refreshTimer: ReturnType<typeof setTimeout> | null = null;
  private statusListener: StatusListener | null = null;
  private authClose: (() => void) | null = null;
  private callbackConsumed = false;
  private suppressWindowCancel = false;
  private getParentWindow: (() => BrowserWindow | null) | null = null;
  /** True while startup refresh has not finished. The sidebar stays signed out. */
  private hold = false;

  constructor(private readonly deps: BackendAuthDeps = {}) {}

  setStatusListener(listener: StatusListener | null): void {
    this.statusListener = listener;
  }

  setParentWindow(getWindow: () => BrowserWindow | null): void {
    this.getParentWindow = getWindow;
  }

  status(): BackendAuthView {
    const visible = !this.hold && this.session !== null && !this.error;
    return {
      status: visible ? "signed_in" : !this.hold && this.error ? "error" : "signed_out",
      origin: this.origin,
      displayName: visible ? this.session?.user.name : undefined,
      needsOrgSetup: visible ? (this.session?.needsOrgSetup ?? false) : false,
      mustChangePassword: visible ? (this.session?.user.mustChangePassword ?? false) : false,
      phase: this.phase,
      error: this.hold ? undefined : this.error,
    };
  }

  async init(): Promise<BackendAuthView> {
    const loaded = (this.deps.loadOrigin ?? readOriginFromStore)();
    if (loaded === undefined) {
      this.origin = DEFAULT_BACKEND_ORIGIN;
      (this.deps.saveOriginValue ?? writeOriginToStore)(this.origin);
    } else {
      this.origin = loaded;
    }
    const cipher = (this.deps.loadCipher ?? readCipherFromStore)();
    this.session = cipher ? this.decodeSession(cipher) : null;
    this.error = undefined;
    this.hold = this.session !== null;
    this.publish();
    if (this.session) await this.refresh();
    this.hold = false;
    this.publish();
    return this.status();
  }

  async saveOrigin(input: string): Promise<{ ok: true; origin: string } | { ok: false; error: string }> {
    const trimmed = input.trim();
    if (!trimmed) {
      await this.dropOrigin("");
      return { ok: true, origin: "" };
    }
    const parsed = parseBackendOrigin(trimmed);
    if (!parsed.ok) return { ok: false, error: "根地址无效" };
    if (parsed.origin === this.origin) return { ok: true, origin: this.origin };
    await this.dropOrigin(parsed.origin);
    return { ok: true, origin: parsed.origin };
  }

  async testConnection(input: string): Promise<{ ok: true } | { ok: false; error: string }> {
    const parsed = parseBackendOrigin(input.trim());
    if (!parsed.ok) return { ok: false, error: "根地址无效" };
    const url = `${parsed.origin}/api/v1/auth/casdoor/login?return_to=${encodeURIComponent("http://127.0.0.1/callback")}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.deps.testConnectionTimeoutMs ?? TEST_CONNECTION_TIMEOUT_MS);
    try {
      const response = await this.fetchImpl(url, { method: "GET", redirect: "manual", signal: controller.signal });
      if (response.status >= 200 && response.status < 400) return { ok: true };
      return { ok: false, error: "连接失败" };
    } catch {
      return { ok: false, error: "连接失败" };
    } finally {
      clearTimeout(timer);
    }
  }

  async login(): Promise<{ ok: true } | { ok: false; error: string }> {
    if (!(this.deps.encryptionAvailable ?? (() => safeStorage.isEncryptionAvailable()))()) {
      return this.fail("系统加密不可用，无法登录。");
    }
    if (!this.origin) return this.fail("根地址无效");
    const round = ++this.round;
    this.closeListener();
    let listener: Listener;
    try {
      listener = await (this.deps.listen ?? defaultListen)((url) => { void this.onCallback(round, url); });
    } catch {
      return this.fail("登录未能开始，请重试。");
    }
    if (this.round !== round) {
      listener.close();
      return { ok: false, error: "登录未能开始，请重试。" };
    }
    this.listener = listener;
    this.callbackConsumed = false;
    this.phase = "waiting_browser";
    this.error = undefined;
    this.armRoundTimer(round);
    this.publish();
    const returnTo = `http://127.0.0.1:${listener.port}/callback`;
    const url = `${this.origin}/api/v1/auth/casdoor/login?return_to=${encodeURIComponent(returnTo)}`;
    try {
      const handle = await (this.deps.openAuthWindow ?? ((input) => openEnterpriseOAuthWindow(input)))({
        url,
        callbackPrefix: returnTo,
        parent: (this.deps.getParentWindow ?? this.getParentWindow)?.() ?? null,
        onConsumed: (callbackUrl) => {
          this.callbackConsumed = true;
          void this.onCallback(round, callbackUrl);
        },
        onClosedBeforeConsume: () => {
          this.authClose = null;
          if (this.suppressWindowCancel || this.callbackConsumed || this.round !== round) return;
          this.cancel();
        },
      });
      this.authClose = handle?.close ?? null;
    } catch {
      this.abandon(round, "无法打开授权窗口。");
      return { ok: false, error: "无法打开授权窗口。" };
    }
    return { ok: true };
  }

  cancel(): BackendAuthView {
    if (this.phase === "idle") return this.status();
    this.suppressWindowCancel = true;
    this.authClose?.();
    this.authClose = null;
    this.suppressWindowCancel = false;
    this.round += 1;
    this.closeListener();
    this.phase = "idle";
    this.publish();
    return this.status();
  }

  async refresh(): Promise<BackendAuthView> {
    if (!this.session) return this.status();
    const round = this.round;
    const body = await this.post("/api/v1/auth/refresh", { refresh_token: this.session.refreshToken });
    if (this.round !== round) return this.status();
    if (!body.ok) {
      this.clearSession();
      this.error = undefined;
      this.publish();
      return this.status();
    }
    this.applyTokenPayload(body.data);
    this.error = undefined;
    this.scheduleRefresh();
    this.publish();
    return this.status();
  }

  async logout(): Promise<BackendAuthView> {
    await this.ensureFresh();
    const token = this.session?.accessToken;
    if (token && this.origin) {
      try {
        await this.fetchImpl(`${this.origin}/api/v1/auth/logout`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch {
        // The local session is deleted even when the request cannot be sent.
      }
    }
    this.clearSession();
    this.phase = "idle";
    this.error = undefined;
    await this.clearPartition();
    this.publish();
    return this.status();
  }

  private async dropOrigin(next: string): Promise<void> {
    const previous = this.origin;
    this.round += 1;
    this.closeListener();
    this.phase = "idle";
    if (previous && this.session) await this.logoutAt(previous);
    this.clearSession();
    this.origin = next;
    this.error = undefined;
    (this.deps.saveOriginValue ?? writeOriginToStore)(next);
    if (previous !== next) await this.clearPartition();
    this.publish();
  }

  private async logoutAt(origin: string): Promise<void> {
    const token = this.session?.accessToken;
    if (!token) return;
    try {
      await this.fetchImpl(`${origin}/api/v1/auth/logout`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {
      // Still drop the local session.
    }
  }

  private async onCallback(round: number, url: URL): Promise<void> {
    if (this.round !== round) return;
    this.callbackConsumed = true;
    this.closeListener();
    const error = url.searchParams.get("error");
    const code = url.searchParams.get("code");
    if (error || !code) {
      this.abandon(round, error ? loginErrorText(error) : "登录未完成");
      return;
    }
    this.phase = "exchanging";
    this.publish();
    const body = await this.post("/api/v1/auth/casdoor/exchange", { code });
    if (this.round !== round) return;
    if (!body.ok) {
      this.abandon(round, body.message);
      return;
    }
    const payload = asRecord(body.data);
    const access = payload?.access_token;
    const refresh = payload?.refresh_token;
    if (typeof access !== "string" || typeof refresh !== "string") {
      this.abandon(round, "登录未完成");
      return;
    }
    this.session = sessionFromPayload(payload, this.now());
    this.persistSession();
    this.phase = "idle";
    this.error = undefined;
    this.scheduleRefresh();
    this.publish();
  }

  private async ensureFresh(): Promise<void> {
    if (!this.session) return;
    if (this.session.expiresAt - this.now() > REFRESH_LEAD_MS) return;
    await this.refresh();
  }

  private async post(path: string, json: unknown): Promise<{ ok: true; data: unknown } | { ok: false; message: string }> {
    if (!this.origin) return { ok: false, message: "根地址无效" };
    try {
      const response = await this.fetchImpl(`${this.origin}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(json),
      });
      const payload = await response.json().catch(() => ({})) as { message?: unknown; data?: unknown };
      if (!response.ok) {
        return { ok: false, message: typeof payload.message === "string" && payload.message ? payload.message : "登录未完成" };
      }
      return { ok: true, data: payload.data ?? payload };
    } catch {
      return { ok: false, message: "登录未完成" };
    }
  }

  private applyTokenPayload(data: unknown): void {
    if (!this.session) return;
    const payload = asRecord(data);
    if (!payload) return;
    if (typeof payload.access_token === "string") this.session.accessToken = payload.access_token;
    if (typeof payload.refresh_token === "string") this.session.refreshToken = payload.refresh_token;
    if (typeof payload.expires_in === "number") this.session.expiresAt = this.now() + payload.expires_in * 1000;
    if (typeof payload.needs_org_setup === "boolean") this.session.needsOrgSetup = payload.needs_org_setup;
    const user = asRecord(payload.user);
    if (user) {
      if (typeof user.name === "string") this.session.user.name = user.name;
      if (typeof user.must_change_password === "boolean") this.session.user.mustChangePassword = user.must_change_password;
    }
    this.persistSession();
  }

  private persistSession(): void {
    if (!this.session) return;
    const encrypt = this.deps.encrypt ?? ((plain: string) => safeStorage.encryptString(plain).toString("base64"));
    (this.deps.saveCipher ?? writeCipherToStore)(encrypt(JSON.stringify(this.session)));
  }

  private decodeSession(cipher: string): StoredSession | null {
    try {
      const decrypt = this.deps.decrypt ?? ((value: string) => safeStorage.decryptString(Buffer.from(value, "base64")));
      const parsed = JSON.parse(decrypt(cipher)) as StoredSession;
      if (!parsed || typeof parsed.refreshToken !== "string" || typeof parsed.accessToken !== "string") return null;
      return parsed;
    } catch {
      return null;
    }
  }

  private clearSession(): void {
    this.session = null;
    if (this.refreshTimer) clearTimeout(this.refreshTimer);
    this.refreshTimer = null;
    (this.deps.saveCipher ?? writeCipherToStore)(null);
  }

  private scheduleRefresh(): void {
    if (this.refreshTimer) clearTimeout(this.refreshTimer);
    if (!this.session) return;
    const delay = Math.max(MIN_REFRESH_DELAY_MS, this.session.expiresAt - this.now() - REFRESH_LEAD_MS);
    this.refreshTimer = setTimeout(() => { void this.refresh(); }, delay);
    this.refreshTimer.unref?.();
  }

  private armRoundTimer(round: number): void {
    if (this.roundTimer) clearTimeout(this.roundTimer);
    this.roundTimer = setTimeout(() => {
      if (this.round === round) this.abandon(round, "登录已超时，请重新登录。");
    }, this.deps.roundTimeoutMs ?? DEFAULT_ROUND_MS);
    this.roundTimer.unref?.();
  }

  private abandon(round: number, message: string): void {
    if (this.round !== round) return;
    this.closeListener();
    this.phase = "idle";
    this.error = message;
    this.publish();
  }

  private fail(message: string): { ok: false; error: string } {
    this.error = message;
    this.phase = "idle";
    this.publish();
    return { ok: false, error: message };
  }

  private async clearPartition(): Promise<void> {
    try {
      await (this.deps.clearOAuthPartition ?? clearEnterpriseOAuthPartition)();
    } catch {
      // A missing partition must not block logout or an origin change.
    }
  }

  private closeListener(): void {
    if (this.roundTimer) clearTimeout(this.roundTimer);
    this.roundTimer = null;
    this.listener?.close();
    this.listener = null;
  }

  private publish(): void {
    this.statusListener?.(this.status());
  }

  private now(): number {
    return (this.deps.now ?? Date.now)();
  }

  private get fetchImpl(): typeof fetch {
    return this.deps.fetchImpl ?? fetch;
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? value as Record<string, unknown> : null;
}

function sessionFromPayload(payload: Record<string, unknown>, now: number): StoredSession {
  const user = asRecord(payload.user);
  const expiresIn = typeof payload.expires_in === "number" ? payload.expires_in : 86400;
  return {
    accessToken: String(payload.access_token),
    refreshToken: String(payload.refresh_token),
    expiresAt: now + expiresIn * 1000,
    needsOrgSetup: payload.needs_org_setup === true,
    user: {
      name: typeof user?.name === "string" ? user.name : "",
      mustChangePassword: user?.must_change_password === true,
    },
  };
}

let instance: BackendAuthService | undefined;

export const backendAuth: BackendAuthService = new Proxy({} as BackendAuthService, {
  get(_target, prop) {
    if (!instance) instance = new BackendAuthService();
    const value = Reflect.get(instance, prop, instance);
    return typeof value === "function" ? value.bind(instance) : value;
  },
});
