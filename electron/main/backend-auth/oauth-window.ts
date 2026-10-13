import { BrowserWindow, session, type Event as ElectronEvent } from "electron";

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

export async function openEnterpriseOAuthWindow(input: OpenAuthWindowInput): Promise<{ close(): void }> {
  let consumed = false;
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
      return url.origin === prefix.origin && url.pathname === prefix.pathname;
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

  win.webContents.on("will-navigate", intercept);
  win.webContents.on("will-redirect", intercept);
  win.webContents.on("did-navigate", (_event, target) => consume(target));
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (!win.isDestroyed()) void win.loadURL(url);
    return { action: "deny" };
  });
  win.on("closed", () => {
    if (!consumed) input.onClosedBeforeConsume();
  });
  await win.loadURL(input.url);
  return { close: () => { if (!win.isDestroyed()) win.close(); } };
}
