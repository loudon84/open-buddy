import { describe, expect, it } from "vitest";
import { parseIdentityContext } from "../src/identity";

const full = {
  user: { id: "user-id", name: "employee" },
  tenant: { id: "tenant-id", name: "company" },
  roles: ["sales_manager"],
  permissions: ["agent.crm.read", "knowledge.search"],
  policies: { agents: ["pi", "hermes"] },
};

describe("parseIdentityContext", () => {
  it("accepts the PRD identity context JSON", () => {
    expect(parseIdentityContext(full)).toEqual(full);
  });

  it("allows policies.agents to be omitted", () => {
    const { policies: _policies, ...rest } = full;
    expect(parseIdentityContext(rest)?.policies).toBeUndefined();
  });

  it("returns null when user.id or tenant.id is missing", () => {
    expect(parseIdentityContext({ ...full, user: { name: "employee" } })).toBeNull();
    expect(parseIdentityContext({ ...full, tenant: { name: "company" } })).toBeNull();
  });

  it("returns null when roles or permissions is not an array of strings", () => {
    expect(parseIdentityContext({ ...full, roles: "sales_manager" })).toBeNull();
    expect(parseIdentityContext({ ...full, permissions: [1] })).toBeNull();
  });
});
