import { describe, expect, it } from "vitest";
import { DocumentLifecycle } from "../../plugins/knowledge/src/ingestion.ts";

describe("P4A-03 ingestion", () => {
  it("keeps the version on retry and clears every store on delete", () => {
    const life = new DocumentLifecycle();
    const first = life.upload({ tenantId: "tenant-a", key: "same", id: "doc-1" });
    const replay = life.upload({ tenantId: "tenant-a", key: "same", id: "doc-2" });
    expect(replay.id).toBe("doc-1");
    expect(life.retry(first.id).version).toBe(1);
    life.revoke("doc-1");
    expect(() => life.retrieve("doc-1", "tenant-a")).toThrow(/revoked/);
    life.delete("doc-1");
    expect(life.blobs.has("doc-1")).toBe(false);
    expect(life.index.has("doc-1")).toBe(false);
    expect(life.cache.has("doc-1")).toBe(false);
    expect(life.poll(4)).toBe("gave-up");
  });
});
