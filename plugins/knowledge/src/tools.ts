export interface Citation {
  documentId: string;
  version: number;
  quote: string;
}

export interface KnowledgeToolInput {
  tenantId: string;
  grant: string;
  documents: Array<{ id: string; tenantId: string; version: number; revoked: boolean; text: string }>;
  question: string;
}

export function retrieveKnowledge(input: KnowledgeToolInput): { citations: Citation[] } | { refused: string } {
  if (input.grant !== "plugin.knowledge.read") return { refused: "unsupported" };
  const hits = input.documents.filter(
    (document) => document.tenantId === input.tenantId && !document.revoked && document.text.includes(input.question),
  );
  if (hits.length === 0) return { refused: "no evidence" };
  return { citations: hits.map((document) => ({ documentId: document.id, version: document.version, quote: document.text })) };
}
