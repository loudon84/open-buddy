import { describe, expect, it } from "vitest";
import { auditLine, authorize } from "../../services/enterprise-workspace/src/authorization";

const memberships = [
  { userId: "user-1", tenantId: "tenant-a", role: "tenant-admin" as const },
  { userId: "user-2", tenantId: "tenant-a", role: "member" as const },
];

describe("P2-02 authorization", () => {
  it("denies a forged actor, a departed member, an expired token, and an implicit admin read", () => {
    const token = { actorId: "user-1", tenantId: "tenant-a", role: "tenant-admin" as const, expiresAt: 100 };
    expect(authorize({ token, now: 1, memberships, actorId: "user-9", action: "workspace.member.manage", resourceTenantId: "tenant-a" }).reason).toBe("forged actor");
    expect(authorize({ token, now: 100, memberships, actorId: "user-1", action: "workspace.member.manage", resourceTenantId: "tenant-a" }).reason).toBe("expired token");
    expect(authorize({ token: { ...token, actorId: "user-3" }, now: 1, memberships, actorId: "user-3", action: "workspace.session.read", resourceTenantId: "tenant-a" }).reason).toBe("left tenant");
    expect(authorize({ token, now: 1, memberships, actorId: "user-1", action: "workspace.document.read", resourceTenantId: "tenant-a" }).decision).toBe("deny");
    expect(authorize({
      token,
      now: 1,
      memberships,
      actorId: "user-1",
      action: "workspace.member.manage",
      resourceTenantId: "tenant-a",
      approval: { paramsHash: "b", boundHash: "a" },
    }).reason).toBe("approval parameters changed");
    expect(authorize({ token: { ...token, actorId: "user-2", role: "member" }, now: 1, memberships, actorId: "user-2", action: "workspace.session.read", resourceTenantId: "tenant-a" }).decision).toBe("allow");
    expect(auditLine(token, "deny")).not.toContain("secret");
  });
});
