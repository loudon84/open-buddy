import { execSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync, writeFileSync, mkdirSync } from "node:fs";
import { join, relative } from "node:path";

const root = join(import.meta.dirname, "../..");
const sourceRoot = "E:/git/smc-copilot";
const skipDir = new Set(["node_modules", "dist", "out", ".pytest_cache"]);

const directories = [
  "apps/work/src/main/knowledge",
  "apps/work/src/shared/knowledge",
  "apps/work/components/file-preview",
];
const extras = [
  "apps/work/LICENSE",
  "apps/work/package.json",
  "apps/work/project.json",
  "apps/work/src/main/hermes.ts",
  "apps/work/src/main/skill-run/skill-run-gateway-client.ts",
];

function walk(dir, acc) {
  for (const entry of readdirSync(join(sourceRoot, dir), { withFileTypes: true })) {
    if (skipDir.has(entry.name)) continue;
    const rel = join(dir, entry.name).replaceAll("\\", "/");
    if (entry.isDirectory()) walk(rel, acc);
    else if (statSync(join(sourceRoot, rel)).isFile()) acc.push(rel);
  }
}

function git(args, cwd) {
  return execSync(`git ${args}`, { cwd, encoding: "utf8" }).trim();
}

const paths = new Set(extras);
for (const dir of directories) {
  const acc = [];
  walk(dir, acc);
  for (const path of acc) paths.add(path);
}

const importRe = /(?:from|import)\s*(?:\(\s*)?["']([^"']+)["']/g;
const external = new Map();

const files = [...paths].sort().map((path) => {
  const bytes = readFileSync(join(sourceRoot, path));
  const text = bytes.toString("utf8");
  const found = [];
  for (const match of text.matchAll(importRe)) {
    const spec = match[1];
    if (spec.includes("runtime-client") || spec.startsWith("@smc/") || spec.startsWith("@open-file-viewer/")) {
      found.push(spec);
      external.set(spec, path);
    }
  }
  return {
    path,
    sha256: createHash("sha256").update(bytes).digest("hex"),
    license: "MIT",
    classification: "source-candidate",
    targetPath: null,
    externalImports: [...new Set(found)].sort(),
  };
});

const inventory = {
  frozenAt: new Date().toISOString(),
  target: {
    head: git("rev-parse HEAD", root),
    scanSnapshot: "2dd37e9eaa8c35496846883c0c47b60153f9ddfb",
    dirty: git("status --short", root)
      .split(/\r?\n/)
      .filter((line) => line.includes(".cursor/plans")),
    packageManager: "pnpm",
    buildGraph: "moon",
  },
  source: {
    root: sourceRoot,
    head: git("rev-parse HEAD", sourceRoot),
    scanSnapshot: "68de354235f2796da8c89b869a9db70955fae20e",
    scope: "apps/work",
    dirty: git("status --short -- apps/work", sourceRoot).split(/\r?\n/).filter(Boolean),
    license: "MIT",
    licenseFile: "apps/work/LICENSE",
  },
  toolchain: [
    { id: "react", source: "^19.2.1", target: "^18.3.1", disposition: "judge-by-target-typecheck" },
    { id: "react-dom", source: "^19.2.1", target: "^18.3.1", disposition: "judge-by-target-typecheck" },
    { id: "@types/react", source: "not copied", target: "^18.3.12", disposition: "judge-by-target-typecheck" },
    { id: "@types/react-dom", source: "not copied", target: "^19.2.7", disposition: "judge-by-target-typecheck" },
    {
      id: "package-manager",
      source: "npm (apps/work/project.json npm ci; repository package-lock.json)",
      target: "pnpm (pnpm-workspace.yaml, packageManager pnpm@11.24.0)",
      disposition: "keep-target-pnpm",
    },
    {
      id: "build-graph",
      source: "nx (apps/work/project.json)",
      target: "moon (moon.yml)",
      disposition: "keep-target-moon",
    },
  ],
  outOfRange: [
    {
      name: "runtime-client-ts",
      evidence: [
        "apps/work/project.json implicitDependencies",
        "apps/work/tsconfig.node.json alias @smc/runtime-client",
      ],
      action: "do-not-copy",
      decision: "D12",
    },
    ...[...external.keys()].sort().filter((name) => !name.includes("runtime-client")).map((name) => ({
      name,
      evidence: [external.get(name)],
      action: "do-not-copy",
      decision: "D12",
      note: "Third-party or out-of-tree specifier seen in the named closure. Not a complete import closure.",
    })),
  ],
  closureNote: "Named migration closure only. externalImports are discovered specifiers, not a full resolver closure.",
  files,
};

mkdirSync(join(root, "docs/architecture"), { recursive: true });
writeFileSync(join(root, "docs/architecture/migration-inventory.json"), `${JSON.stringify(inventory, null, 2)}\n`);

const baseline = `# Architecture baseline

Frozen: ${inventory.frozenAt}

This file records the P0-01 execution-time baseline. It does not copy source files and it does not change dependency ranges. Recording the React ranges is not a JSX compatibility pass; P0-06 runs the repository typecheck, and P4A-02 checks migrated JSX.

## Heads

| Checkout | Execution HEAD | Scan snapshot |
| --- | --- | --- |
| OpenBuddy (\`E:/git/open-buddy\`) | \`${inventory.target.head}\` | \`${inventory.target.scanSnapshot}\` |
| smc-copilot (\`E:/git/smc-copilot\`) | \`${inventory.source.head}\` | \`${inventory.source.scanSnapshot}\` |

The target scan snapshot is an ancestor, not HEAD. The source snapshot still matches HEAD. \`apps/work\` dirty paths: ${inventory.source.dirty.length === 0 ? "none" : inventory.source.dirty.join(", ")}.

Target dirty paths are left untouched:

${inventory.target.dirty.map((line) => `- \`${line}\``).join("\n") || "- none"}

## Toolchain dispositions

| Difference | Disposition |
| --- | --- |
| Source React \`^19.2.1\` versus target \`react\` / \`react-dom\` \`^18.3.1\` | Keep the target. Do not bump. |
| Target \`@types/react\` \`^18.3.12\` and \`@types/react-dom\` \`^19.2.7\` | Keep this existing combination. Compatibility is judged by target typecheck, not by editing ranges. |
| npm + Nx versus pnpm + moon | Keep \`pnpm-workspace.yaml\` and \`moon.yml\`. Do not copy \`package-lock.json\` or \`project.json\` targets. |
| \`packages/runtime-client-ts\` | D12. Do not copy. |

## Migration closure

${inventory.files.length} files under \`apps/work\`, each classified \`source-candidate\` with \`targetPath: null\`. License for the work application is MIT (\`apps/work/LICENSE\`). Hashes live in [migration-inventory.json](migration-inventory.json). A hash mismatch means stop migrating that file.

The file list is the named closure (Hermes entry points, knowledge, and file preview), not every file in \`apps/work\`. Discovered out-of-tree specifiers are not a complete import closure.
`;

writeFileSync(join(root, "docs/architecture/baseline.md"), baseline);
console.log(`wrote ${inventory.files.length} files`);
