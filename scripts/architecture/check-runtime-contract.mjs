import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dirname, "../..");
const contract = join(root, "services/hermes-agent-gateway/contracts");

export function checkRuntimeContract() {
  const errors = [];
  const types = readFileSync(join(root, "packages/runtime/openbuddy-runtime-adapter/src/types.ts"), "utf8");
  const openapi = readFileSync(join(contract, "openapi.yaml"), "utf8");
  const events = JSON.parse(readFileSync(join(contract, "events.schema.json"), "utf8"));
  const map = JSON.parse(readFileSync(join(contract, "method-map.json"), "utf8"));
  const denied = JSON.parse(readFileSync(join(contract, "fixtures/cross-tenant-denied.json"), "utf8"));

  if (/from\s+["']electron["']/.test(types)) errors.push("portable types import electron");
  if (openapi.includes("/api/session")) errors.push("draft /api/session path is present");
  if (!openapi.includes("Idempotency-Key")) errors.push("missing idempotency header");
  if (!openapi.includes('version: 1.0.0')) errors.push("missing schema version");
  if (denied.response?.status !== 404 || denied.response?.body?.error?.code !== "NOT_FOUND") {
    errors.push("cross-tenant fixture must be 404 NOT_FOUND");
  }
  const eventTypes = events.properties?.type?.enum ?? [];
  for (const name of ["approval.required", "run.cancelled", "run.failed"]) {
    if (!eventTypes.includes(name)) errors.push(`event schema missing ${name}`);
  }
  if (events.properties?.schemaVersion?.const !== "1.0") errors.push("event schemaVersion");

  for (const row of map) {
    if (!types.includes(`${row.method}(`)) errors.push(`types missing ${row.method}`);
    if (row.path) {
      if (!openapi.includes(`${row.path}:`)) errors.push(`openapi missing ${row.path}`);
    }
  }
  return { ok: errors.length === 0, errors };
}

if (process.argv[1]?.endsWith("check-runtime-contract.mjs")) {
  const result = checkRuntimeContract();
  if (!result.ok) {
    for (const error of result.errors) console.error(error);
    process.exit(1);
  }
  console.log("runtime contract ok");
}
