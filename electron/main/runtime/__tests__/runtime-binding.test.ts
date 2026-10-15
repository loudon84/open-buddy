import { mkdtempSync } from "node:fs";
import { rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { closeStorage, openStorageSync, SessionCatalog } from "@openbuddy/storage";
import { RuntimeBindingStore } from "../runtime-binding";

describe("runtime session binding", () => {
  let dir = "";

  afterEach(async () => {
    if (dir) await rm(dir, { recursive: true, force: true });
  });

  it("defaults old sessions to local-pi, keeps the binding across reopen, and rejects a runtime change", () => {
    dir = mkdtempSync(join(tmpdir(), "ob-runtime-bind-"));
    const file = join(dir, "openbuddy.sqlite");
    const opened = openStorageSync({ filePath: file, appVersion: "runtime-binding-test" });
    const store = new RuntimeBindingStore(new SessionCatalog(opened.driver));
    expect(store.read("legacy").runtimeId).toBe("local-pi");
    store.bind("s1", "remote-hermes:h1", {
      instanceId: "h1",
      remoteSessionId: "remote-1",
      lastSeq: 0,
      identityEpoch: 1,
      state: "active",
      createdAt: "2026-10-15T00:00:00.000Z",
    });
    closeStorage(opened);
    const reopened = openStorageSync({ filePath: file, appVersion: "runtime-binding-test" });
    const again = new RuntimeBindingStore(new SessionCatalog(reopened.driver));
    expect(again.read("s1").remoteSessionId).toBe("remote-1");
    expect(() => again.bind("s1", "local-pi", {
      instanceId: "local-pi",
      lastSeq: 0,
      identityEpoch: 1,
      state: "active",
      createdAt: "2026-10-15T00:00:00.000Z",
    })).toThrow(/immutable/);
    closeStorage(reopened);
  });
});
