import { describe, expect, it } from "vitest";
import type { IdentityContext } from "@openbuddy/shared-types";
import { identityView } from "../identity-view";

const context: IdentityContext = {
  user: { id: "user-1", name: "Ada" },
  tenant: { id: "tenant-1", name: "ACME" },
  roles: ["sales_manager"],
  permissions: ["agent.crm.read"],
  policies: { agents: ["pi"] },
};

describe("identityView", () => {
  it("returns null when signed out and strips permissions", () => {
    expect(identityView(null)).toBeNull();
    expect(identityView(context)).toEqual({
      user: { id: "user-1", name: "Ada" },
      tenant: { id: "tenant-1", name: "ACME" },
      roles: ["sales_manager"],
    });
    expect(identityView(context)).not.toHaveProperty("permissions");
    expect(identityView(context)).not.toHaveProperty("policies");
  });
});
