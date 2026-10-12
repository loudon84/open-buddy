import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { classifyMigrationPath, knowledgeBackendContract } from "../../plugins/knowledge/src/backend-contract.ts";

describe("P4A-01 knowledge migration map", () => {
  it("migrates the HTTP provider, excludes the remote facade, and keeps React 18", () => {
    const inventory = JSON.parse(readFileSync("docs/architecture/migration-inventory.json", "utf8")) as { files: Array<{ path: string }> };
    const knowledge = inventory.files.map((file) => file.path).filter((path) => path.includes("/knowledge/") || path.includes("file-preview"));
    expect(knowledge.some((path) => path.endsWith("knowledge-http-provider.ts"))).toBe(true);
    expect(classifyMigrationPath("apps/work/src/main/knowledge/knowledge-http-provider.ts")).toBe("migrate");
    expect(classifyMigrationPath("apps/work/src/main/knowledge/knowledge-provider-facade.ts")).toBe("exclude");
    expect(classifyMigrationPath("apps/work/src/main/knowledge/knowledge-mock-adapter.ts")).toBe("exclude");
    const react = JSON.parse(readFileSync("package.json", "utf8")) as { dependencies: { react: string } };
    expect(react.dependencies.react).toContain("18.3.1");
    expect(knowledgeBackendContract.probed).toBe(false);
    expect(knowledgeBackendContract.requires).toEqual(["acl", "version", "delete"]);
    expect(knowledge.length).toBeGreaterThan(0);
  });
});
