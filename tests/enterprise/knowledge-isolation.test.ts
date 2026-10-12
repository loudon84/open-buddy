import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { DocumentLifecycle } from "../../plugins/knowledge/src/ingestion.ts";
import { retrieveKnowledge } from "../../plugins/knowledge/src/tools.ts";
import { resolvePreview } from "../../packages/capability/openbuddy-file-preview/src/resolve.ts";
import { knowledgeBackendContract } from "../../plugins/knowledge/src/backend-contract.ts";

describe("P4A-07 knowledge fixture chain", () => {
  it("links map, ingest, preview, and citation without a live backend", () => {
    expect(knowledgeBackendContract.probed).toBe(false);
    const life = new DocumentLifecycle();
    life.upload({ tenantId: "tenant-a", key: "k", id: "doc" });
    const view = resolvePreview({ provider: "knowledge", tenantId: "tenant-a", ownerTenantId: "tenant-a", revoked: false, expiresAt: 10, ref: "doc" }, 1);
    expect(view.ref).toBe("doc");
    const answer = retrieveKnowledge({
      tenantId: "tenant-a",
      grant: "plugin.knowledge.read",
      documents: [{ id: "doc", tenantId: "tenant-a", version: 1, revoked: false, text: "hello" }],
      question: "hello",
    });
    expect("citations" in answer).toBe(true);
    const script = readFileSync("scripts/enterprise/knowledge-smoke.mjs", "utf8");
    expect(script).toContain("process.exit(2)");
  });
});
