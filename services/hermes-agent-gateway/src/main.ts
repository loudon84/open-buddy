import { createCasdoorAccessTokenVerify } from "./casdoor-verify";
import { assertDeploymentConfig } from "./operations";
import { startGateway } from "./server";

export function gatewayDeploymentFromEnv(env: NodeJS.ProcessEnv = process.env) {
  return {
    tls: env.OPENBUDDY_GATEWAY_TLS !== "false",
    rateLimitPerMinute: Number(env.OPENBUDDY_GATEWAY_RATE_LIMIT ?? "60"),
    secretRef: env.OPENBUDDY_GATEWAY_SECRET_REF ?? "secret://casdoor-jwks",
    issuer: env.OPENBUDDY_CASDOOR_ISSUER ?? "",
    audience: env.OPENBUDDY_CASDOOR_AUDIENCE ?? "",
    dbPath: env.OPENBUDDY_GATEWAY_DB ?? "./hermes-gateway.json",
  };
}

export async function main(env: NodeJS.ProcessEnv = process.env) {
  const config = gatewayDeploymentFromEnv(env);
  assertDeploymentConfig(config);
  const verify = createCasdoorAccessTokenVerify({
    issuer: config.issuer,
    audience: config.audience,
    keys: () => [],
  });
  return startGateway({ dbPath: config.dbPath, verify });
}
