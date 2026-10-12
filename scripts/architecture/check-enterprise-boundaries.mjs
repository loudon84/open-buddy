import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dirname, "../..");

const REQUIRED_OWNERS = [
  "desktop-main",
  "hermes-agent-gateway",
  "casdoor-resource-gateway",
  "enterprise-workspace",
  "external-hermes",
];

const REQUIRED_DENIES = [
  ["packages/core", "plugins/"],
  ["packages/ui", "packages/runtime/openbuddy-hermes-client"],
  ["packages/runtime/openbuddy-runtime-adapter", "electron"],
  ["packages/runtime/openbuddy-hermes-client", "electron"],
];

export function checkEnterpriseBoundaries(argv = process.argv.slice(2)) {
  const errors = [];
  if (!argv.includes("--spec-only")) {
    return { ok: false, errors: ["refusing a repo scan until P0-06; pass --spec-only"] };
  }

  const spec = JSON.parse(readFileSync(join(root, "docs/architecture/dependency-boundaries.json"), "utf8"));
  const adr = readFileSync(join(root, "docs/adr/0001-enterprise-boundaries.md"), "utf8");
  const owners = new Set((spec.owners ?? []).map((owner) => owner.id));
  for (const id of REQUIRED_OWNERS) {
    if (!owners.has(id)) errors.push(`missing owner ${id}`);
  }
  const agent = (spec.owners ?? []).find((owner) => owner.id === "hermes-agent-gateway");
  const resource = (spec.owners ?? []).find((owner) => owner.id === "casdoor-resource-gateway");
  if (!agent?.mustNotOwn?.includes("agent-execution")) errors.push("agent gateway must not own execution");
  if (!resource?.mustNotOwn?.includes("agent-execution")) errors.push("resource gateway must not own execution");
  if (agent?.owns?.some((item) => resource?.owns?.includes(item))) errors.push("agent and resource gateways share an owned responsibility");

  for (const [from, to] of REQUIRED_DENIES) {
    const found = (spec.denyEdges ?? []).some((edge) => edge.from === from && edge.to === to);
    if (!found) errors.push(`missing deny ${from} -> ${to}`);
  }
  if (!(spec.forbiddenRoots ?? []).includes("apps/desktop")) errors.push("apps/desktop is not forbidden");
  if (existsSync(join(root, "apps/desktop"))) errors.push("apps/desktop exists");
  for (const phrase of ["Agent gateway", "resource gateway", "apps/desktop", "Ekko"]) {
    if (!adr.toLowerCase().includes(phrase.toLowerCase())) errors.push(`ADR missing ${phrase}`);
  }
  return { ok: errors.length === 0, errors };
}

if (process.argv[1]?.endsWith("check-enterprise-boundaries.mjs")) {
  const result = checkEnterpriseBoundaries();
  if (!result.ok) {
    for (const error of result.errors) console.error(error);
    process.exit(1);
  }
  console.log("enterprise boundaries spec ok");
}
