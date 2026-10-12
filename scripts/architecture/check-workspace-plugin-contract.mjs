import { readFileSync } from "node:fs";
import { join } from "node:path";
import { decideMembership } from "../../packages/runtime/openbuddy-workspace/src/types.ts";
import { validateEnterpriseManifest } from "../../packages/runtime/openbuddy-plugin-sdk/src/enterprise-contract.ts";

const root = join(import.meta.dirname, "../..");

export function checkWorkspacePluginContract() {
  const errors = [];
  const matrix = JSON.parse(readFileSync(join(root, "docs/architecture/permission-matrix.json"), "utf8"));
  if (matrix.decision !== "D01") errors.push("matrix must cite D01");
  if (matrix.unknownRole?.effect !== "deny") errors.push("unknown role must fail closed");
  for (const role of ["tenant-admin", "workspace-admin", "member", "viewer"]) {
    if (!matrix.roles?.includes(role)) errors.push(`missing role ${role}`);
  }

  const memberships = [
    { tenantId: "t1", workspaceId: "w1", actorId: "u1", role: "member" },
    { tenantId: "t2", workspaceId: "w2", actorId: "u1", role: "viewer" },
  ];
  const allowed = decideMembership(memberships, { tenantId: "t1", workspaceId: "w1", actorId: "u1" }, "write");
  const otherTenant = decideMembership(memberships, { tenantId: "t2", workspaceId: "w1", actorId: "u1" }, "read");
  if (allowed.decision !== "allow") errors.push("same-tenant member write");
  if (otherTenant.decision !== "deny") errors.push("cross-tenant membership must deny");

  const manifest = {
    id: "com.smc.crm",
    name: "CRM",
    version: "1.0.0",
    apiVersion: "1.0",
    publisher: "smc",
    permissions: ["crm.customer.read"],
    capabilities: { surfaces: ["remote-backend"], isolationProfile: "remote-container-v1" },
  };
  if (validateEnterpriseManifest(manifest, false).ok) errors.push("sandbox must fail closed");
  if (!validateEnterpriseManifest({ ...manifest, capabilities: { surfaces: ["isolated-ui"], isolationProfile: "none" } }, false).ok) {
    errors.push("ui-only manifest should validate without a sandbox");
  }
  if (validateEnterpriseManifest({ ...manifest, permissions: ["customer.read"] }, true).ok) {
    errors.push("legacy permission alias must not validate as a grant");
  }
  return { ok: errors.length === 0, errors };
}

if (process.argv[1]?.endsWith("check-workspace-plugin-contract.mjs")) {
  const result = checkWorkspacePluginContract();
  if (!result.ok) {
    for (const error of result.errors) console.error(error);
    process.exit(1);
  }
  console.log("workspace plugin contract ok");
}
