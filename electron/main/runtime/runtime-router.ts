import { normalizeRuntimeId } from "../../../packages/runtime/openbuddy-runtime-adapter/src/types";
import { localBinding, type RuntimeBinding } from "./runtime-binding";

export interface RuntimeRoute {
  kind: "local-pi" | "remote";
  runtimeId: string;
  binding: RuntimeBinding;
}

const memory = new Map<string, RuntimeBinding>();

export function rememberRuntimeBinding(sessionId: string, binding: RuntimeBinding): void {
  memory.set(sessionId, binding);
}

export function forgetRuntimeBinding(sessionId: string): void {
  memory.delete(sessionId);
}

export function resolveRuntimeRoute(sessionId: string | undefined, read?: (sessionId: string) => RuntimeBinding): RuntimeRoute {
  const binding = (sessionId && (memory.get(sessionId) ?? read?.(sessionId))) || localBinding();
  const runtimeId = normalizeRuntimeId(binding.runtimeId);
  return { kind: runtimeId === "local-pi" ? "local-pi" : "remote", runtimeId, binding };
}

function runtimeFamily(id: string): string {
  const normalized = normalizeRuntimeId(id);
  if (normalized === "local-pi" || normalized.startsWith("local-pi:")) return "local-pi";
  if (normalized === "remote-hermes" || normalized.startsWith("remote-hermes:")) return "remote-hermes";
  return normalized;
}

export function policyAllows(allowed: readonly string[] | undefined, runtimeId: string): boolean {
  if (!allowed) return true;
  const target = runtimeFamily(runtimeId);
  return allowed.some((item) => runtimeFamily(item) === target);
}

const PI_ONLY = new Set([
  "agent:steer",
  "agent:follow-up",
  "agent:set-model",
  "agent:prompt-content",
  "agent:compact",
  "agent:fork-session",
  "agent:rewind",
]);

export function unsupportedOnRemote(channel: string, route: RuntimeRoute): Error | null {
  if (route.kind === "local-pi" || !PI_ONLY.has(channel)) return null;
  return new Error(`[UNSUPPORTED_CAPABILITY] ${channel} is not available on ${route.runtimeId}`);
}
