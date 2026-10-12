export interface BrowserProfile {
  id: string;
  tenantId: string;
  partition: string;
}

export class BrowserRuntime {
  private readonly profiles = new Map<string, BrowserProfile>();

  open(tenantId: string): BrowserProfile {
    const profile: BrowserProfile = { id: `profile-${tenantId}`, tenantId, partition: `persist:${tenantId}` };
    this.profiles.set(profile.id, profile);
    return profile;
  }

  read(profileId: string, tenantId: string): BrowserProfile {
    const profile = this.profiles.get(profileId);
    if (!profile || profile.tenantId !== tenantId) throw new Error("isolated");
    return profile;
  }
}

export const cdpDebugPort = null;
