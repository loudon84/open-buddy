export interface KnowledgeDocument {
  id: string;
  tenantId: string;
  title: string;
  version: number;
}

export interface KnowledgeClient {
  list(tenantId: string): Promise<KnowledgeDocument[]>;
}

export interface KnowledgeView {
  titles: string[];
}

export class KnowledgePlugin {
  private registered = false;

  constructor(private readonly client: KnowledgeClient) {}

  enable(): void {
    this.registered = true;
  }

  disable(): void {
    this.registered = false;
  }

  async list(input: { tenantId: string; grant: boolean }): Promise<KnowledgeView> {
    if (!this.registered) throw new Error("plugin disabled");
    if (!input.grant) throw new Error("acl denied");
    const documents = await this.client.list(input.tenantId);
    return { titles: documents.filter((document) => document.tenantId === input.tenantId).map((document) => document.title) };
  }
}

export function localDocuments(tenantId: string): KnowledgeDocument[] {
  return [{ id: "local-1", tenantId, title: "desktop-notes", version: 1 }];
}
