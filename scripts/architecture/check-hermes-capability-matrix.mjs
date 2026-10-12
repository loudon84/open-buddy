import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dirname, "../..");
const ALLOWED = new Set(["observed-client", "contract-tested", "unsupported"]);
const REQUIRED = ["chat-completions", "run-events", "cancel", "approval", "artifact", "auth", "resume"];

export function checkHermesCapabilityMatrix(argv = process.argv.slice(2)) {
  const errors = [];
  if (argv.includes("--profile=staging")) {
    return { ok: false, errors: ["D03 staging is not configured; refusing a live probe"] };
  }
  const matrix = JSON.parse(readFileSync(join(root, "docs/architecture/hermes-capability-matrix.json"), "utf8"));
  const notes = readFileSync(join(root, "docs/architecture/deployment-prerequisites.md"), "utf8");
  if (matrix.probed !== false) errors.push("matrix must stay unprobed until D03");
  if (matrix.profile !== "fixtures") errors.push("profile must be fixtures");
  const byId = new Map((matrix.capabilities ?? []).map((row) => [row.id, row]));
  for (const id of REQUIRED) {
    const row = byId.get(id);
    if (!row) errors.push(`missing capability ${id}`);
    else if (!ALLOWED.has(row.status)) errors.push(`bad status ${id}`);
    else if (row.status === "contract-tested") errors.push(`${id} cannot be contract-tested without a probe`);
    else if (!row.evidence) errors.push(`missing evidence ${id}`);
  }
  if (!notes.includes("D03")) errors.push("prerequisites must name D03");
  if (!notes.toLowerCase().includes("production")) errors.push("prerequisites must forbid production data");
  return { ok: errors.length === 0, errors };
}

if (process.argv[1]?.endsWith("check-hermes-capability-matrix.mjs")) {
  const result = checkHermesCapabilityMatrix(["--fixtures"]);
  if (!result.ok) {
    for (const error of result.errors) console.error(error);
    process.exit(1);
  }
  console.log("hermes capability matrix fixtures ok");
}
