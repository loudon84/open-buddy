import { describe, expect, it } from "vitest";
import { DocumentLifecycle } from "../../plugins/knowledge/src/ingestion";

describe("P4A-03 ingestion", () => {
  it("keeps the version on retry and clears every store on delete", () => {
    const life = new DocumentLifecycle();
    const first = life.upload({ tenantId: "tenant-a", key: "same", id: "doc-1", contentHash: "h1" });
    const replay = life.upload({ tenantId: "tenant-a", key: "same", id: "doc-2", contentHash: "h1" });
    expect(replay.id).toBe("doc-1");
    expect(() => life.upload({ tenantId: "tenant-a", key: "same", id: "doc-3", contentHash: "h2" })).toThrow(/different content/);
    expect(life.retry("tenant-a", first.id).version).toBe(1);
    life.revoke("tenant-a", "doc-1");
    expect(() => life.retrieve("tenant-a", "doc-1")).toThrow(/revoked/);
    life.delete("tenant-a", "doc-1");
    expect(life.has("blobs", "tenant-a", "doc-1")).toBe(false);
    expect(life.has("index", "tenant-a", "doc-1")).toBe(false);
    expect(life.has("cache", "tenant-a", "doc-1")).toBe(false);
    expect(life.poll(4)).toBe("gave-up");
  });

  it("does not share upload keys or document ids across tenants", () => {
    const life = new DocumentLifecycle();
    const a = life.upload({ tenantId: "tenant-a", key: "same", id: "doc", contentHash: "ha" });
    const b = life.upload({ tenantId: "tenant-b", key: "same", id: "doc", contentHash: "hb" });
    expect(a.tenantId).toBe("tenant-a");
    expect(b.tenantId).toBe("tenant-b");
    expect(b.contentHash).toBe("hb");
    life.revoke("tenant-b", "doc");
    expect(life.retrieve("tenant-a", "doc").revoked).toBe(false);
    life.delete("tenant-b", "doc");
    expect(life.has("index", "tenant-a", "doc")).toBe(true);
    expect(() => life.retrieve("tenant-c", "doc")).toThrow(/not found/);
  });
});
