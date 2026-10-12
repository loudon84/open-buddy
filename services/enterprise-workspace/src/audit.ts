export interface AuditRecord {
  actorId: string;
  action: string;
}

export function writeAudit(event: { actorId: string; action: string; token?: string; cookie?: string; body?: string }): AuditRecord {
  return { actorId: event.actorId, action: event.action };
}

export function readAudit(grants: string[], records: AuditRecord[]): AuditRecord[] {
  if (!grants.includes("audit.read")) throw new Error("audit read denied");
  return records;
}

export function deleteResource(input: { legalHold: boolean; d02Signed: boolean; mode: "archive" | "physical-delete" }): { blocked: boolean; indexCleared: boolean; cacheCleared: boolean } {
  if (input.legalHold || (input.mode === "physical-delete" && !input.d02Signed)) {
    return { blocked: true, indexCleared: false, cacheCleared: false };
  }
  return { blocked: false, indexCleared: true, cacheCleared: true };
}

export function reconcile(expected: string[], actual: string[]): { missing: string[] } {
  return { missing: expected.filter((id) => !actual.includes(id)) };
}
