export interface ProjectedTask {
  taskId: string;
  runId: string;
  businessTitle: string;
  runTerminal: string | null;
}

export class TaskProjection {
  private readonly seen = new Set<string>();
  private readonly tasks = new Map<string, ProjectedTask>();
  private seq: number[] = [];

  apply(event: { eventId: string; seq: number; taskId: string; runId: string; type: "business" | "run.terminal"; title?: string; terminal?: string }): ProjectedTask {
    const existing = this.tasks.get(event.taskId);
    if (this.seen.has(event.eventId)) {
      if (!existing) throw new Error("missing task");
      return existing;
    }
    this.seen.add(event.eventId);
    this.seq.push(event.seq);
    const task = existing ?? { taskId: event.taskId, runId: event.runId, businessTitle: "", runTerminal: null };
    if (event.type === "business" && event.title) task.businessTitle = event.title;
    if (event.type === "run.terminal" && event.terminal) task.runTerminal = event.terminal;
    this.tasks.set(event.taskId, task);
    return task;
  }

  snapshot(): { seq: number[]; tasks: ProjectedTask[] } {
    return { seq: [...this.seq], tasks: [...this.tasks.values()] };
  }

  static restore(snapshot: { seq: number[]; tasks: ProjectedTask[] }, events: Array<{ eventId: string; seq: number }>): number[] {
    const seen = new Set(events.filter((event) => snapshot.seq.includes(event.seq)).map((event) => event.seq));
    return [...seen].sort((left, right) => left - right);
  }
}

export class ArtifactApi {
  private readonly artifacts = new Map<string, { tenantId: string; ref: string; revoked: boolean }>();

  put(id: string, tenantId: string, ref: string): void {
    if (ref.startsWith("/") || /^[A-Za-z]:\\/.test(ref)) throw new Error("local path is not an artifact ref");
    this.artifacts.set(id, { tenantId, ref, revoked: false });
  }

  revoke(id: string): void {
    const artifact = this.artifacts.get(id);
    if (!artifact) throw new Error("not found");
    artifact.revoked = true;
  }

  resolve(callerTenantId: string, id: string): string {
    const artifact = this.artifacts.get(id);
    if (!artifact || artifact.tenantId !== callerTenantId || artifact.revoked) throw new Error("artifact denied");
    return artifact.ref;
  }
}
