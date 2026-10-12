import { describe, expect, it } from "vitest";
import { performAction } from "../../services/enterprise-browser/src/actions.ts";

describe("P4B-04 browser actions", () => {
  it("requires a fresh approval and refuses a CRM bypass", () => {
    expect(performAction({ kind: "click", selector: "#ok", approvalId: "a1", expiresAt: 20, decided: true, crmBypass: false }, 10).applied).toBe(true);
    expect(() => performAction({ kind: "fill", selector: "#q", value: "x", expiresAt: 20, decided: false, crmBypass: false }, 10)).toThrow(/approval/);
    expect(() => performAction({ kind: "click", selector: "#ok", approvalId: "a1", expiresAt: 10, decided: true, crmBypass: false }, 10)).toThrow(/approval/);
    expect(() => performAction({ kind: "click", selector: "#ok", approvalId: "a1", expiresAt: 20, decided: true, crmBypass: true }, 10)).toThrow(/crm/);
  });
});
