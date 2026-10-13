export interface RuntimeConfig {
  id: string;
  endpoint: string;
  secretRef?: string;
}

export function parseRuntimeConfig(input: Record<string, unknown>): RuntimeConfig {
  if ("token" in input) {
    throw new Error("inline token is not allowed");
  }
  if (typeof input.id !== "string" || input.id.length === 0) {
    throw new Error("runtime id is required");
  }
  if (typeof input.endpoint !== "string" || input.endpoint.length === 0) {
    throw new Error("runtime endpoint is required");
  }
  if (input.secretRef !== undefined && typeof input.secretRef !== "string") {
    throw new Error("secretRef must be a string");
  }
  return {
    id: input.id,
    endpoint: input.endpoint,
    ...(typeof input.secretRef === "string" ? { secretRef: input.secretRef } : {}),
  };
}
