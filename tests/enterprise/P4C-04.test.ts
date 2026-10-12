import { describe, expect, it } from "vitest";
import { CrmOutbox, type ApprovalRecord } from "../../services/enterprise-crm/src/outbox";

const approval = (tenantId: string, bodyHash: string): ApprovalRecord => ({ id: `apr-${tenantId}`, tenantId, bodyHash, decision: "approve" });

describe("P4C-04 CRM outbox", () => {
  it("requires an approval for the exact body and replays the same key", () => {
    const outbox = new CrmOutbox();
    expect(() => outbox.commit({ tenantId: "tenant-a", key: "k1", bodyHash: "h1", approval: null })).toThrow(/approval/);
    expect(() => outbox.commit({ tenantId: "tenant-a", key: "k1", bodyHash: "h1", approval: approval("tenant-a", "other") })).toThrow(/approval/);
    expect(() => outbox.commit({ tenantId: "tenant-a", key: "k1", bodyHash: "h1", approval: approval("tenant-b", "h1") })).toThrow(/approval/);
    const first = outbox.commit({ tenantId: "tenant-a", key: "k1", bodyHash: "h1", approval: approval("tenant-a", "h1") });
    expect(outbox.commit({ tenantId: "tenant-a", key: "k1", bodyHash: "h1", approval: approval("tenant-a", "h1") })).toBe(first);
    expect(() => outbox.commit({ tenantId: "tenant-a", key: "k1", bodyHash: "h2", approval: approval("tenant-a", "h2") })).toThrow(/conflict/);
  });

  it("keeps the same key separate per tenant", () => {
    const outbox = new CrmOutbox();
    const a = outbox.commit({ tenantId: "tenant-a", key: "k1", bodyHash: "ha", approval: approval("tenant-a", "ha") });
    const b = outbox.commit({ tenantId: "tenant-b", key: "k1", bodyHash: "hb", approval: approval("tenant-b", "hb") });
    expect(a).not.toBe(b);
    expect(outbox.list("tenant-a").map((row) => row.bodyHash)).toEqual(["ha"]);
  });

  it("reconciles by remote receipt instead of comparing the local key to remote ids", async () => {
    const outbox = new CrmOutbox();
    outbox.commit({ tenantId: "tenant-a", key: "k-ok", bodyHash: "h1", approval: approval("tenant-a", "h1") });
    outbox.commit({ tenantId: "tenant-a", key: "k-lost", bodyHash: "h2", approval: approval("tenant-a", "h2") });
    outbox.commit({ tenantId: "tenant-a", key: "k-missing", bodyHash: "h3", approval: approval("tenant-a", "h3") });
    expect((await outbox.dispatch("tenant-a", "k-ok", async () => ({ remoteId: "crm-881" }))).state).toBe("committed");
    for (const key of ["k-lost", "k-missing"]) {
      const row = await outbox.dispatch("tenant-a", key, async () => {
        throw new Error("timeout after send");
      });
      expect(row.state).toBe("unknown");
    }
    const open = await outbox.reconcile("tenant-a", async (key) => (key === "k-lost" ? "crm-882" : null));
    expect(open.map((row) => [row.key, row.state])).toEqual([["k-missing", "pending"]]);
    const rows = outbox.list("tenant-a");
    expect(rows.find((row) => row.key === "k-ok")?.remoteId).toBe("crm-881");
    expect(rows.find((row) => row.key === "k-lost")?.remoteId).toBe("crm-882");
  });
});
