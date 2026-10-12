import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dirname, "../..");
const sourceRoot = "E:/git/smc-copilot";

const EXPECTED_RANGES = {
  react: "^18.3.1",
  "react-dom": "^18.3.1",
  "@types/react": "^18.3.12",
  "@types/react-dom": "^19.2.7",
};

const SCAN_TARGET = "2dd37e9eaa8c35496846883c0c47b60153f9ddfb";
const SCAN_SOURCE = "68de354235f2796da8c89b869a9db70955fae20e";

export function checkBaselineInventory() {
  const errors = [];
  const inventoryPath = join(root, "docs/architecture/migration-inventory.json");
  let inventory;
  try {
    inventory = JSON.parse(readFileSync(inventoryPath, "utf8"));
  } catch (error) {
    return { ok: false, errors: [`inventory unreadable: ${error.message}`] };
  }

  if (!Array.isArray(inventory.files) || inventory.files.length === 0) {
    errors.push("files must be a non-empty array");
  } else {
    for (const file of inventory.files) {
      if (!String(file.path).startsWith("apps/work/")) errors.push(`outside apps/work: ${file.path}`);
      if (String(file.path).includes("node_modules")) errors.push(`node_modules row: ${file.path}`);
      if (String(file.path).includes("runtime-client-ts")) errors.push(`copied runtime-client-ts: ${file.path}`);
      if (file.classification !== "source-candidate") errors.push(`classification ${file.path}`);
      if (file.targetPath !== null) errors.push(`targetPath set for ${file.path}`);
      if (file.license !== "MIT") errors.push(`license ${file.path}`);
      try {
        const digest = createHash("sha256").update(readFileSync(join(sourceRoot, file.path))).digest("hex");
        if (digest !== file.sha256) errors.push(`sha changed, stop migration: ${file.path}`);
      } catch (error) {
        errors.push(`cannot hash ${file.path}: ${error.message}`);
      }
    }
  }

  const runtime = (inventory.outOfRange ?? []).find((row) => row.name === "runtime-client-ts");
  if (!runtime || runtime.action !== "do-not-copy" || runtime.decision !== "D12") {
    errors.push("runtime-client-ts must be D12 do-not-copy");
  }

  const packageJson = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
  const declared = { ...packageJson.dependencies, ...packageJson.devDependencies };
  for (const [name, range] of Object.entries(EXPECTED_RANGES)) {
    if (declared[name] !== range) errors.push(`package.json ${name} is ${declared[name]}, expected ${range}`);
    const row = (inventory.toolchain ?? []).find((item) => item.id === name);
    if (!row || row.target !== range || row.disposition !== "judge-by-target-typecheck") {
      errors.push(`toolchain row missing or retuned: ${name}`);
    }
  }
  for (const id of ["package-manager", "build-graph"]) {
    if (!(inventory.toolchain ?? []).some((row) => row.id === id)) errors.push(`missing toolchain ${id}`);
  }

  if (inventory.target?.scanSnapshot !== SCAN_TARGET) errors.push("target scan snapshot mismatch");
  if (inventory.source?.scanSnapshot !== SCAN_SOURCE) errors.push("source scan snapshot mismatch");
  if (!/^[0-9a-f]{40}$/.test(inventory.target?.head ?? "")) errors.push("target head");
  if (!/^[0-9a-f]{40}$/.test(inventory.source?.head ?? "")) errors.push("source head");

  return { ok: errors.length === 0, errors };
}

if (import.meta.url === new URL(process.argv[1], "file:").href || process.argv[1]?.endsWith("check-baseline-inventory.mjs")) {
  const result = checkBaselineInventory();
  if (!result.ok) {
    for (const error of result.errors) console.error(error);
    process.exit(1);
  }
  console.log("P0-01 baseline inventory ok");
}
