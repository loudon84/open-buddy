import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

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

const SCAN_ROOTS = [
  "packages/core",
  "packages/ui",
  "packages/runtime/openbuddy-runtime-adapter",
  "packages/runtime/openbuddy-hermes-client",
];

const FIXTURE_ROOT = "tests/enterprise/fixtures/deny-edges";
const IMPORT_RE = /(?:from|import|require)\s*(?:\(\s*)?["']([^"']+)["']/g;

function matchesEdge(fromRoot, specifier, edgeFrom, edgeTo) {
  if (fromRoot !== edgeFrom) return false;
  if (edgeTo.endsWith("/")) return specifier === edgeTo.slice(0, -1) || specifier.startsWith(edgeTo);
  return specifier === edgeTo || specifier.startsWith(`${edgeTo}/`) || specifier.includes(edgeTo);
}

function walk(dir, files) {
  if (!existsSync(dir)) return;
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === "dist" || name === "out") continue;
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path, files);
    else if (name.endsWith(".ts") || name.endsWith(".tsx")) files.push(path);
  }
}

function fromRootFor(relPath, declared) {
  if (declared) return declared;
  return SCAN_ROOTS.find((prefix) => relPath === prefix || relPath.startsWith(`${prefix}/`)) ?? null;
}

export function findDenyEdgeViolations(scanRoots = SCAN_ROOTS) {
  const violations = [];
  const files = [];
  for (const scanRoot of scanRoots) walk(join(root, scanRoot), files);
  for (const file of files) {
    const relPath = relative(root, file).replaceAll("\\", "/");
    const text = readFileSync(file, "utf8");
    const declared = text.match(/^\s*\/\/\s*boundary-from:\s*(\S+)/m)?.[1] ?? null;
    const fromRoot = fromRootFor(relPath, declared);
    if (!fromRoot) continue;
    for (const match of text.matchAll(IMPORT_RE)) {
      const specifier = match[1];
      for (const [edgeFrom, edgeTo] of REQUIRED_DENIES) {
        if (matchesEdge(fromRoot, specifier, edgeFrom, edgeTo)) {
          violations.push(`${relPath}: ${fromRoot} imports ${specifier}`);
        }
      }
    }
  }
  return violations;
}

function checkSpec() {
  const errors = [];
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
  if (agent?.owns?.some((item) => resource?.owns?.includes(item))) {
    errors.push("agent and resource gateways share an owned responsibility");
  }
  for (const [from, to] of REQUIRED_DENIES) {
    const found = (spec.denyEdges ?? []).some((edge) => edge.from === from && edge.to === to);
    if (!found) errors.push(`missing deny ${from} -> ${to}`);
  }
  if (!(spec.forbiddenRoots ?? []).includes("apps/desktop")) errors.push("apps/desktop is not forbidden");
  if (existsSync(join(root, "apps/desktop"))) errors.push("apps/desktop exists");
  for (const phrase of ["Agent gateway", "resource gateway", "apps/desktop", "Ekko"]) {
    if (!adr.toLowerCase().includes(phrase.toLowerCase())) errors.push(`ADR missing ${phrase}`);
  }
  return errors;
}

function checkDiscovery() {
  const errors = [];
  const workspace = readFileSync(join(root, "pnpm-workspace.yaml"), "utf8");
  const rootTs = readFileSync(join(root, "tsconfig.json"), "utf8");
  const scripts = readFileSync(join(root, "package.json"), "utf8");
  if (!workspace.includes("packages/runtime/*")) errors.push("pnpm-workspace does not include packages/runtime/*");
  for (const name of ["@openbuddy/runtime-adapter", "@openbuddy/workspace"]) {
    if (!rootTs.includes(name)) errors.push(`root tsconfig missing ${name}`);
  }
  for (const dir of [
    "packages/runtime/openbuddy-runtime-adapter",
    "packages/runtime/openbuddy-workspace",
  ]) {
    if (!existsSync(join(root, dir, "moon.yml"))) errors.push(`missing ${dir}/moon.yml`);
    if (!existsSync(join(root, dir, "tsconfig.json"))) errors.push(`missing ${dir}/tsconfig.json`);
    if (!existsSync(join(root, dir, "package.json"))) errors.push(`missing ${dir}/package.json`);
  }
  if (!scripts.includes("verify:enterprise-boundaries")) errors.push("missing verify:enterprise-boundaries script");
  return errors;
}

export function checkEnterpriseBoundaries(argv = process.argv.slice(2)) {
  const errors = checkSpec();
  if (argv.includes("--spec-only")) return { ok: errors.length === 0, errors, fixtureViolations: [] };
  errors.push(...checkDiscovery());

  const fixtureViolations = findDenyEdgeViolations([FIXTURE_ROOT]);
  if (fixtureViolations.length === 0) errors.push("deny-edge fixture was not detected");
  const realViolations = findDenyEdgeViolations();
  for (const violation of realViolations) errors.push(`real tree: ${violation}`);
  return { ok: errors.length === 0, errors, fixtureViolations, realViolations };
}

if (process.argv[1]?.endsWith("check-enterprise-boundaries.mjs")) {
  const result = checkEnterpriseBoundaries();
  if (!result.ok) {
    for (const error of result.errors) console.error(error);
    process.exit(1);
  }
  console.log(`enterprise boundaries ok (${result.fixtureViolations.length} fixture violations detected)`);
}
