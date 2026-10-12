import { describe, expect, it } from "vitest";
import { CrmOutbox } from "../../services/enterprise-crm/src/outbox.ts";

describe("P4C-04 CRM outbox", () => {
  it("replays the same key and lists rows the remote has not acknowledged", () => {
    const outbox = new CrmOutbox();
    expect(() => outbox.commit({ tenantId: "tenant-a", key: "k1", bodyHash: "h1", approved: false })).toThrow(/approval/);
    const first = outbox.commit({ tenantId: "tenant-a", key: "k1", bodyHash: "h1", approved: true });
    expect(outbox.commit({ tenantId: "tenant-a", key: "k1", bodyHash: "h1", approved: true })).toBe(first);
    expect(() => outbox.commit({ tenantId: "tenant-a", key: "k1", bodyHash: "h2", approved: true })).toThrow(/conflict/);
    expect(outbox.reconcile([])).toEqual(["k1"]);
  });
});
