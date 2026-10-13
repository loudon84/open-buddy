import type { RuntimeRegistry } from "../../../packages/runtime-core/src/index";
import type { RuntimeRequest, RuntimeResponse } from "../../../packages/runtime-core/src/index";

export class RuntimeManager {
  constructor(readonly registry: RuntimeRegistry) {}

  get activeId(): string {
    return this.registry.getActive().id;
  }

  list() {
    return this.registry.list();
  }

  switchRuntime(id: string): Promise<void> {
    return this.registry.switchRuntime(id);
  }

  chat(request: RuntimeRequest): Promise<RuntimeResponse> {
    return this.registry.getActive().chat(request);
  }
}
