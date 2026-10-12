import { describe, expect, it } from "vitest";
import { deleteResource, readAudit, reconcile, writeAudit } from "../../services/enterprise-workspace/src/audit";

describe("P2-06 audit and retention", () => {
  it("redacts secrets, blocks physical delete, and reports missing ids", () => {
    const record = writeAudit({ actorId: "user-1", action: "workspace.update", token: "secret-token", cookie: "sid", body: "full text" });
    expect(JSON.stringify(record)).not.toContain("secret-token");
    expect(JSON.stringify(record)).not.toContain("sid");
    expect(JSON.stringify(record)).not.toContain("full text");
    expect(() => readAudit(["workspace.session.read"], [record])).toThrow(/denied/);
    expect(readAudit(["audit.read"], [record])).toEqual([record]);
    expect(deleteResource({ legalHold: true, d02Signed: true, mode: "archive" })).toMatchObject({ blocked: true, indexCleared: false });
    expect(deleteResource({ legalHold: false, d02Signed: false, mode: "physical-delete" })).toMatchObject({ blocked: true });
    expect(deleteResource({ legalHold: false, d02Signed: false, mode: "archive" })).toMatchObject({ blocked: false, indexCleared: true, cacheCleared: true });
    expect(reconcile(["a", "b"], ["b"])).toEqual({ missing: ["a"] });
  });
});
