export const crmFieldContract = {
  probed: false,
  requiredFields: [] as string[],
  externalIdBoundToTenant: true,
};

export interface Customer {
  externalId: string;
  tenantId: string;
  name: string;
}

export class CrmDirectory {
  private readonly rows: Customer[] = [];

  add(row: Customer): void {
    this.rows.push(row);
  }

  query(tenantId: string, grant: boolean): Array<{ externalId: string; name: string }> {
    if (!grant) throw new Error("acl");
    return this.rows.filter((row) => row.tenantId === tenantId).map(({ externalId, name }) => ({ externalId, name }));
  }
}
