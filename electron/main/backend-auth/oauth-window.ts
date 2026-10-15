import { BrowserWindow, protocol, session, type Event as ElectronEvent } from "electron";

export const OAUTH_PARTITION = "persist:enterprise-oauth";

export type OpenAuthWindowInput = {
  url: string;
  callbackPrefix: string;
  parent?: BrowserWindow | null;
  onConsumed: (url: URL) => void;
  onClosedBeforeConsume: () => void;
};

export async function clearEnterpriseOAuthPartition(): Promise<void> {
  await session.fromPartition(OAUTH_PARTITION).clearStorageData();
}

let activeCapture: ((url: string) => boolean) | null = null;
let casdoorProtocolInstalled = false;

function installCasdoorProtocolCapture(): void {
  if (casdoorProtocolInstalled) return;
  casdoorProtocolInstalled = true;
  protocol.handle("casdoor", (request) => {
    const captured = activeCapture?.(request.url) ?? false;
    return new Response(captured ? "" : "ignored", { status: captured ? 204 : 404 });
  });
}

export async function openEnterpriseOAuthWindow(input: OpenAuthWindowInput): Promise<{ close(): void }> {
  let consumed = false;
  let listening = true;
  installCasdoorProtocolCapture();
  const win = new BrowserWindow({
    parent: input.parent ?? undefined,
    modal: false,
    width: 480,
    height: 720,
    title: "企业登录",
    webPreferences: {
      partition: OAUTH_PARTITION,
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  const matches = (target: string): boolean => {
    try {
      const url = new URL(target);
      const prefix = new URL(input.callbackPrefix);
      return url.protocol === prefix.protocol && url.hostname === prefix.hostname && url.pathname === prefix.pathname;
    } catch {
      return false;
    }
  };

  const consume = (target: string): void => {
    if (consumed || !matches(target)) return;
    consumed = true;
    input.onConsumed(new URL(target));
    if (!win.isDestroyed()) win.close();
  };

  const intercept = (event: ElectronEvent, target: string): void => {
    if (!matches(target)) return;
    event.preventDefault();
    consume(target);
  };

  activeCapture = (target) => {
    if (!listening || !matches(target)) return false;
    consume(target);
    return true;
  };
  session.fromPartition(OAUTH_PARTITION).webRequest.onBeforeRequest({ urls: ["casdoor://*/*", "http://127.0.0.1/*"] }, (details, callback) => {
    if (listening && matches(details.url)) {
      consume(details.url);
      callback({ cancel: true });
      return;
    }
    callback({});
  });
  win.webContents.on("will-navigate", intercept);
  win.webContents.on("will-redirect", intercept);
  win.webContents.on("did-navigate", (_event, target) => consume(target));
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (matches(url)) {
      consume(url);
      return { action: "deny" };
    }
    if (!win.isDestroyed()) void win.loadURL(url);
    return { action: "deny" };
  });
  win.on("closed", () => {
    listening = false;
    if (activeCapture) activeCapture = null;
    if (!consumed) input.onClosedBeforeConsume();
  });
  await win.loadURL(input.url);
  return { close: () => { if (!win.isDestroyed()) win.close(); } };
}
