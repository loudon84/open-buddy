import type { RuntimePhase } from "../../../packages/ui/openbuddy-ui-enterprise/src/runtime-panel.tsx";

export interface RuntimeShellState {
  phase: RuntimePhase;
  endpointRef: string;
}

export function runtimeShellState(phase: RuntimePhase, endpointRef: string): RuntimeShellState {
  return { phase, endpointRef };
}
