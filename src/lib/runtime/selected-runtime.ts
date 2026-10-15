let selectedRuntimeId = "local-pi";

export function setSelectedRuntimeId(runtimeId: string): void {
  selectedRuntimeId = runtimeId === "pi" ? "local-pi" : runtimeId === "hermes" ? "remote-hermes" : runtimeId;
}

export function getSelectedRuntimeId(): string {
  return selectedRuntimeId;
}
