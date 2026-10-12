export interface StoredDocument {
  id: string;
  tenantId: string;
  version: number;
  key: string;
  revoked: boolean;
}

export class DocumentLifecycle {
  readonly documents = new Map<string, StoredDocument>();
  readonly blobs = new Set<string>();
  readonly index = new Set<string>();
  readonly cache = new Set<string>();
  private readonly keys = new Map<string, string>();

  upload(input: { tenantId: string; key: string; id: string }): StoredDocument {
    const existing = this.keys.get(input.key);
    if (existing) return this.documents.get(existing)!;
    const document: StoredDocument = { id: input.id, tenantId: input.tenantId, version: 1, key: input.key, revoked: false };
    this.documents.set(input.id, document);
    this.keys.set(input.key, input.id);
    this.blobs.add(input.id);
    this.index.add(input.id);
    this.cache.add(input.id);
    return document;
  }

  retry(id: string): StoredDocument {
    const document = this.documents.get(id);
    if (!document) throw new Error("missing document");
    return document;
  }

  revoke(id: string): void {
    const document = this.documents.get(id);
    if (!document) throw new Error("missing document");
    document.revoked = true;
    this.cache.delete(id);
  }

  retrieve(id: string, tenantId: string): StoredDocument {
    const document = this.documents.get(id);
    if (!document || document.tenantId !== tenantId) throw new Error("not found");
    if (document.revoked) throw new Error("revoked");
    return document;
  }

  delete(id: string): void {
    this.documents.delete(id);
    this.blobs.delete(id);
    this.index.delete(id);
    this.cache.delete(id);
  }

  poll(attempts: number): "settled" | "gave-up" {
    if (attempts > 3) return "gave-up";
    return "settled";
  }
}
