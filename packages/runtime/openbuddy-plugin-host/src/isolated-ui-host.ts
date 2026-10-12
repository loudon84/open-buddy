const allowedTypes = new Set(["resize", "notify"]);

export interface SurfaceRegistration {
  viewRef: string;
  tenantId: string;
  uiGrant: boolean;
  backendGrant: boolean;
}

export class IsolatedUiHost {
  menus: string[] = [];
  subscriptions: string[] = [];
  active: SurfaceRegistration | null = null;

  mount(registration: SurfaceRegistration): { sandbox: string; viewRef: string } {
    if (!registration.uiGrant) throw new Error("ui grant required");
    this.active = registration;
    this.menus = [`menu:${registration.viewRef}`];
    this.subscriptions = [`sub:${registration.viewRef}`];
    return { sandbox: "allow-scripts", viewRef: registration.viewRef };
  }

  receive(message: { type?: string; channel?: string; secret?: string; node?: boolean }): { type: string } {
    if (message.node || message.channel === "ipc" || message.secret) {
      throw new Error("host access denied");
    }
    if (!message.type || !allowedTypes.has(message.type)) throw new Error("schema rejected");
    return { type: message.type };
  }

  changeScope(tenantId: string): void {
    if (this.active && this.active.tenantId !== tenantId) {
      this.active = null;
      this.menus = [];
      this.subscriptions = [];
    }
  }

  disable(): void {
    this.active = null;
    this.menus = [];
    this.subscriptions = [];
  }
}
