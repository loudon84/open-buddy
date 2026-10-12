import { describe, expect, it } from "vitest";
import { ArtifactApi, TaskProjection } from "../../services/enterprise-workspace/src/task-projection.ts";

describe("P2-04 task projection", () => {
  it("ignores a duplicate event and refuses a cross-tenant artifact", () => {
    const projection = new TaskProjection();
    projection.apply({ eventId: "e1", seq: 1, taskId: "task-1", runId: "run-1", type: "run.terminal", terminal: "completed" });
    const again = projection.apply({ eventId: "e1", seq: 1, taskId: "task-1", runId: "run-1", type: "business", title: "renamed" });
    expect(again).toMatchObject({ businessTitle: "", runTerminal: "completed" });
    const titled = projection.apply({ eventId: "e2", seq: 2, taskId: "task-1", runId: "run-1", type: "business", title: "Budget" });
    expect(titled.runTerminal).toBe("completed");
    expect(titled.businessTitle).toBe("Budget");

    const restored = TaskProjection.restore(projection.snapshot(), [
      { eventId: "e1", seq: 1 },
      { eventId: "e2", seq: 2 },
    ]);
    expect(restored).toEqual([1, 2]);

    const artifacts = new ArtifactApi();
    artifacts.put("art-1", "tenant-a", "artifact://art-1");
    expect(() => artifacts.put("art-2", "tenant-a", "C:\\secret.txt")).toThrow(/local path/);
    expect(artifacts.resolve("tenant-a", "art-1")).toBe("artifact://art-1");
    expect(() => artifacts.resolve("tenant-b", "art-1")).toThrow(/denied/);
    artifacts.revoke("art-1");
    expect(() => artifacts.resolve("tenant-a", "art-1")).toThrow(/denied/);
  });
});
