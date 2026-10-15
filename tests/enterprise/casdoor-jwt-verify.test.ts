import { generateKeyPairSync, sign as signRaw } from "node:crypto";
import { describe, expect, it } from "vitest";
import { createCasdoorAccessTokenVerify } from "../../services/hermes-agent-gateway/src/casdoor-verify";

function token(privateKey: ReturnType<typeof generateKeyPairSync>["privateKey"], payload: Record<string, unknown>, kid = "k1"): string {
  const header = Buffer.from(JSON.stringify({ alg: "RS256", kid, typ: "JWT" })).toString("base64url");
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = signRaw("RSA-SHA256", Buffer.from(`${header}.${body}`), privateKey).toString("base64url");
  return `${header}.${body}.${signature}`;
}

describe("Casdoor JWT verify for the Hermes gateway", () => {
  const { publicKey, privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  const jwk = publicKey.export({ format: "jwk" }) as { kid?: string };
  jwk.kid = "k1";
  const now = 1_700_000_000_000;
  const verify = createCasdoorAccessTokenVerify({
    issuer: "https://casdoor.internal",
    audience: "openbuddy",
    keys: () => [jwk],
    now: () => now,
  });
  const claims = {
    iss: "https://casdoor.internal",
    aud: "openbuddy",
    sub: "user-1",
    organization: "tenant-a",
    roles: ["member"],
    exp: Math.floor(now / 1000) + 600,
  };

  it("accepts a signed token", () => {
    expect(verify({ authorization: `Bearer ${token(privateKey, claims)}` })).toMatchObject({
      tenantId: "tenant-a",
      actorId: "user-1",
      role: "member",
    });
  });

  it("rejects a bad audience, an expired token, and a forged signature", () => {
    expect(verify({ authorization: `Bearer ${token(privateKey, { ...claims, aud: "other" })}` })).toBeNull();
    expect(verify({ authorization: `Bearer ${token(privateKey, { ...claims, exp: 1 })}` })).toBeNull();
    const forged = token(privateKey, claims).replace(/.$/, "x");
    expect(verify({ authorization: `Bearer ${forged}` })).toBeNull();
  });
});