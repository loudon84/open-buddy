export interface StoredDocument {
  id: string;
  tenantId: string;
  version: number;
  key: string;
  contentHash: string;
  revoked: boolean;
}

function scoped(tenantId: string, value: string): string {
  if (!tenantId || !value) throw new Error("tenant and id are required");
  return JSON.stringify([tenantId, value]);
}

export class DocumentLifecycle {
  readonly documents = new Map<string, StoredDocument>();
  readonly blobs = new Set<string>();
  readonly index = new Set<string>();
  readonly cache = new Set<string>();
  private readonly keys = new Map<string, string>();

  upload(input: { tenantId: string; key: string; id: string; contentHash: string }): StoredDocument {
    const keyRef = scoped(input.tenantId, input.key);
    const existingId = this.keys.get(keyRef);
    if (existingId) {
      const existing = this.documents.get(existingId)!;
      if (existing.contentHash !== input.contentHash) throw new Error("idempotency key reused with different content");
      return existing;
    }
    const ref = scoped(input.tenantId, input.id);
    if (this.documents.has(ref)) throw new Error("document id already exists");
    const document: StoredDocument = {
      id: input.id,
      tenantId: input.tenantId,
      version: 1,
      key: input.key,
      contentHash: input.contentHash,
      revoked: false,
    };
    this.documents.set(ref, document);
    this.keys.set(keyRef, ref);
    this.blobs.add(ref);
    this.index.add(ref);
    this.cache.add(ref);
    return document;
  }

  retry(tenantId: string, id: string): StoredDocument {
    return this.require(tenantId, id);
  }

  revoke(tenantId: string, id: string): void {
    const document = this.require(tenantId, id);
    document.revoked = true;
    this.cache.delete(scoped(tenantId, id));
  }

  retrieve(tenantId: string, id: string): StoredDocument {
    const document = this.require(tenantId, id);
    if (document.revoked) throw new Error("revoked");
    return document;
  }

  delete(tenantId: string, id: string): void {
    const document = this.require(tenantId, id);
    const ref = scoped(tenantId, id);
    this.documents.delete(ref);
    this.keys.delete(scoped(tenantId, document.key));
    this.blobs.delete(ref);
    this.index.delete(ref);
    this.cache.delete(ref);
  }

  has(store: "blobs" | "index" | "cache", tenantId: string, id: string): boolean {
    return this[store].has(scoped(tenantId, id));
  }

  poll(attempts: number): "settled" | "gave-up" {
    if (attempts > 3) return "gave-up";
    return "settled";
  }

  private require(tenantId: string, id: string): StoredDocument {
    const document = this.documents.get(scoped(tenantId, id));
    if (!document) throw new Error("not found");
    return document;
  }
}
