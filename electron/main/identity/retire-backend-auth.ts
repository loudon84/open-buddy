import { app } from "electron";
import { join } from "node:path";
import { openStorageSync, SettingsDocumentStore } from "@openbuddy/storage";
import { clearEnterpriseOAuthPartition } from "../backend-auth/oauth-window";

const CUTOVER_NAMESPACE = "identity:casdoor-cutover";

/** One-time local cleanup when the desktop runs in casdoor mode (REQ-CU-41). Does not delete source. */
export async function retireBackendAuthLocalState(): Promise<void> {
  const opened = openStorageSync({
    filePath: join(app.getPath("userData"), "openbuddy.sqlite"),
    appVersion: "openbuddy-identity",
  });
  const store = new SettingsDocumentStore(opened.driver);
  if (store.get(CUTOVER_NAMESPACE)) return;
  store.delete("backend-auth:session");
  store.delete("backend-auth:config");
  store.delete("identity:context");
  store.set(CUTOVER_NAMESPACE, { at: new Date().toISOString() });
  await clearEnterpriseOAuthPartition().catch(() => undefined);
}
