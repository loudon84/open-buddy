import { createPublicKey, createVerify } from "node:crypto";
import type { IncomingHttpHeaders } from "node:http";
import type { VerifiedIdentity } from "./server";

type Jwk = Record<string, unknown> & { kid?: string };

function decodePart(part: string): Record<string, unknown> | null {
  try {
    const json = Buffer.from(part.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function roleOf(claims: Record<string, unknown>): VerifiedIdentity["role"] {
  const roles = Array.isArray(claims.roles) ? claims.roles.map(String) : [];
  if (roles.includes("tenant-admin")) return "tenant-admin";
  if (roles.includes("viewer")) return "viewer";
  return "member";
}

function tenantOf(claims: Record<string, unknown>): string | null {
  if (typeof claims.organization === "string" && claims.organization) return claims.organization;
  if (Array.isArray(claims.organizations) && typeof claims.organizations[0] === "string") return claims.organizations[0];
  return null;
}

function signatureOk(tokenParts: string[], alg: string, jwk: Jwk): boolean {
  const hashes: Record<string, string> = { RS256: "RSA-SHA256", RS384: "RSA-SHA384", RS512: "RSA-SHA512" };
  const hash = hashes[alg];
  if (!hash) return false;
  const signature = Buffer.from(tokenParts[2].replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (tokenParts[2].length % 4)) % 4), "base64");
  const verifier = createVerify(hash);
  verifier.update(`${tokenParts[0]}.${tokenParts[1]}`);
  verifier.end();
  return verifier.verify(createPublicKey({ key: jwk as never, format: "jwk" }), signature);
}

/**
 * Synchronous Casdoor access-token check for `startGateway({ verify })`.
 * `keys()` is the JWKS cache (refresh it at most every 10 minutes).
 * On an unknown `kid`, `reloadKeys` runs once.
 */
export function createCasdoorAccessTokenVerify(options: {
  issuer: string;
  audience: string;
  keys: () => Jwk[];
  reloadKeys?: () => Jwk[];
  now?: () => number;
}): (headers: IncomingHttpHeaders) => VerifiedIdentity | null {
  const now = options.now ?? Date.now;
  let reloaded = false;
  return (headers) => {
    const header = headers.authorization ?? headers.Authorization;
    const value = Array.isArray(header) ? header[0] : header;
    if (!value?.startsWith("Bearer ")) return null;
    const parts = value.slice("Bearer ".length).trim().split(".");
    if (parts.length !== 3) return null;
    const jose = decodePart(parts[0]);
    const claims = decodePart(parts[1]);
    if (!jose || !claims || typeof jose.kid !== "string" || typeof jose.alg !== "string") return null;
    if (claims.iss !== options.issuer) return null;
    const aud = claims.aud;
    const audiences = Array.isArray(aud) ? aud : [aud];
    if (!audiences.includes(options.audience)) return null;
    if (typeof claims.exp !== "number" || claims.exp * 1000 <= now()) return null;
    if (typeof claims.sub !== "string" || !claims.sub) return null;
    const tenantId = tenantOf(claims);
    if (!tenantId) return null;
    let key = options.keys().find((item) => item.kid === jose.kid);
    if (!key && !reloaded && options.reloadKeys) {
      reloaded = true;
      key = options.reloadKeys().find((item) => item.kid === jose.kid);
    }
    if (!key || !signatureOk(parts, jose.alg, key)) return null;
    const workspace = typeof claims.workspace === "string" && claims.workspace ? claims.workspace : tenantId;
    return { tenantId, workspaceId: workspace, actorId: claims.sub, role: roleOf(claims) };
  };
}
