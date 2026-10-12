export interface ShellScope {
  tenantId: string;
  items: string[];
  activeRun: "background" | "cancelled" | null;
  offlineAt: string | null;
  readonly: boolean;
}

export function createScope(tenantId: string): ShellScope {
  return { tenantId, items: [], activeRun: null, offlineAt: null, readonly: false };
}

export function switchTenant(state: ShellScope, tenantId: string, activeRun: "background" | "cancelled"): ShellScope {
  return { tenantId, items: [], activeRun, offlineAt: null, readonly: false };
}

export function applyResponse(state: ShellScope, response: { tenantId: string; item: string }): ShellScope {
  if (response.tenantId !== state.tenantId) return state;
  return { ...state, items: [...state.items, response.item] };
}

export function goOffline(state: ShellScope, at: string): ShellScope {
  return { ...state, offlineAt: at, readonly: true };
}
