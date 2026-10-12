import type { RuntimePhase } from "../../../packages/runtime/openbuddy-runtime-adapter/src/types";

export interface RuntimeShellState {
  phase: RuntimePhase;
  endpointRef: string;
}

export function runtimeShellState(phase: RuntimePhase, endpointRef: string): RuntimeShellState {
  return { phase, endpointRef };
}
