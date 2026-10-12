/**
 * Production adapter selection.
 * Portable: this module must not import Electron or business plugins.
 * local-pi is the desktop Pi runtime. It is not Local Hermes.
 */

export type AdapterRegistrationKind = "local-pi" | "remote-hermes";

export interface AdapterRegistration {
  id: string;
  kind: AdapterRegistrationKind;
  fixture: boolean;
}

export class AdapterRegistry {
  private readonly adapters: AdapterRegistration[] = [];

  register(adapter: AdapterRegistration): void {
    this.adapters.push(adapter);
  }

  resolveDefault(): AdapterRegistration {
    const production = this.adapters.filter((adapter) => !adapter.fixture && adapter.kind === "local-pi");
    const selected = production[0];
    if (!selected) {
      throw new Error("fixture adapters cannot be the production default");
    }
    return selected;
  }
}
