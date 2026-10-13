import { describe, expect, it } from "vitest";
import { backendAccountNotice, type BackendAuthView } from "./backend-auth-client";

function view(extra: Partial<BackendAuthView> = {}): BackendAuthView {
  return {
    status: "signed_in",
    origin: "https://id.example",
    needsOrgSetup: false,
    mustChangePassword: false,
    phase: "idle",
    ...extra,
  };
}

describe("backendAccountNotice", () => {
  it("prefixes the tenant name and marks a stale identity cache", () => {
    expect(backendAccountNotice(view({ tenant: { id: "t1", name: "ACME" } }))).toBe("ACME");
    expect(backendAccountNotice(view({ tenant: { id: "t1", name: "ACME" }, identityStale: true }))).toBe("⚠ ACME");
    expect(backendAccountNotice(view({ tenant: { id: "t1", name: "ACME" }, needsOrgSetup: true }))).toBe("ACME 请到业务门户完成组织设置。");
    expect(backendAccountNotice(view({ status: "signed_out" }))).toBeUndefined();
  });
});
