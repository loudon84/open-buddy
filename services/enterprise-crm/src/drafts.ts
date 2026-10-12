export interface DraftSource {
  kind: "browser" | "knowledge";
  id: string;
  tenantId: string;
}

export function createDraft(input: { tenantId: string; source: DraftSource; text: string }): { committed: false; sourceId: string; text: string } {
  if (input.source.tenantId !== input.tenantId) throw new Error("source tenant");
  if (!input.source.id) throw new Error("source");
  return { committed: false, sourceId: input.source.id, text: input.text };
}
