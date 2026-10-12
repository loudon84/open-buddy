import { validateEnterpriseManifest, type EnterpriseManifest } from "./enterprise-contract";

export const supportedSurfaces = ["renderer", "tool"] as const;
export const knownPermissions = ["plugin.session.read", "plugin.tool.execute"] as const;

export interface PackageDescriptor {
  id: string;
  version: string;
  dependencies: string[];
  permissions: string[];
  surfaces: string[];
  legacyAliases: string[];
}

export function legacyGrants(alias: string): string[] {
  if (alias === "customer.read") return [];
  return [alias];
}

function semver(version: string): boolean {
  return /^\d+\.\d+\.\d+$/.test(version);
}

function walk(id: string, graph: Map<string, string[]>, stack: string[]): void {
  if (stack.includes(id)) throw new Error(`dependency cycle at ${id}`);
  const next = graph.get(id) ?? [];
  for (const dependency of next) walk(dependency, graph, [...stack, id]);
}

export function negotiate(packages: PackageDescriptor[], sandboxAvailable: boolean): EnterpriseManifest[] {
  const seen = new Set<string>();
  const graph = new Map(packages.map((pkg) => [pkg.id, pkg.dependencies]));
  const accepted: EnterpriseManifest[] = [];
  for (const pkg of packages) {
    if (seen.has(pkg.id)) throw new Error(`duplicate id ${pkg.id}`);
    seen.add(pkg.id);
    if (!semver(pkg.version)) throw new Error(`semver ${pkg.version}`);
    for (const permission of pkg.permissions) {
      if (!knownPermissions.includes(permission as (typeof knownPermissions)[number])) {
        throw new Error(`unknown permission ${permission}`);
      }
    }
    for (const alias of pkg.legacyAliases) {
      for (const grant of legacyGrants(alias)) {
        if (!pkg.permissions.includes(grant)) throw new Error(`legacy alias expanded ${alias}`);
      }
    }
    for (const surface of pkg.surfaces) {
      if (!supportedSurfaces.includes(surface as (typeof supportedSurfaces)[number])) {
        throw new Error(`unsupported surface ${surface}`);
      }
    }
    walk(pkg.id, graph, []);
    const manifest: EnterpriseManifest = {
      id: pkg.id,
      name: pkg.id,
      version: pkg.version,
      apiVersion: "1.0",
      publisher: "openbuddy",
      permissions: pkg.permissions,
      capabilities: { surfaces: pkg.surfaces, isolationProfile: "host" },
    };
    const result = validateEnterpriseManifest(manifest, sandboxAvailable);
    if (!result.ok) throw new Error(result.reason);
    accepted.push(manifest);
  }
  return accepted;
}
