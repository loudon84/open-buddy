export interface KnowledgeBackendContract {
  probed: false;
  operations: ["list", "get", "search", "retrieve", "delete"];
  requires: ["acl", "version", "delete"];
  excluded: ["apps/work/src/main/knowledge/knowledge-provider-facade.ts", "apps/work/src/main/knowledge/knowledge-mock-adapter.ts", "apps/work/src/main/knowledge/knowledge-mock-store.ts"];
  targetReact: "18";
}

export const knowledgeBackendContract: KnowledgeBackendContract = {
  probed: false,
  operations: ["list", "get", "search", "retrieve", "delete"],
  requires: ["acl", "version", "delete"],
  excluded: [
    "apps/work/src/main/knowledge/knowledge-provider-facade.ts",
    "apps/work/src/main/knowledge/knowledge-mock-adapter.ts",
    "apps/work/src/main/knowledge/knowledge-mock-store.ts",
  ],
  targetReact: "18",
};

export function classifyMigrationPath(path: string): "migrate" | "exclude" | "ignore" {
  if (knowledgeBackendContract.excluded.some((item) => path.endsWith(item) || path === item)) return "exclude";
  if (path.includes("/knowledge/") || path.includes("file-preview")) return "migrate";
  return "ignore";
}
