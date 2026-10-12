export interface ObjectType {
  name: string;
  schemaVersion: number;
  tenantId: string;
}

export class ObjectCatalog {
  private readonly types: ObjectType[] = [];

  register(type: ObjectType): void {
    const current = this.types.find((item) => item.name === type.name && item.tenantId === type.tenantId);
    if (current && type.schemaVersion < current.schemaVersion) throw new Error("schema");
    this.types.push(type);
  }

  list(tenantId: string): ObjectType[] {
    return this.types.filter((type) => type.tenantId === tenantId);
  }
}

export interface Relation {
  fromId: string;
  toId: string;
  tenantId: string;
}

export function queryRelations(rows: Relation[], tenantId: string, grant: boolean): Relation[] {
  if (!grant) throw new Error("acl");
  return rows.filter((row) => row.tenantId === tenantId);
}

export interface Quote {
  id: string;
  prepared: boolean;
  committed: boolean;
  compensated: boolean;
}

export function prepareQuote(id: string): Quote {
  return { id, prepared: true, committed: false, compensated: false };
}

export function commitQuote(quote: Quote, approved: boolean): Quote {
  if (!quote.prepared || !approved) {
    return { ...quote, committed: false, compensated: true };
  }
  return { ...quote, committed: true };
}
