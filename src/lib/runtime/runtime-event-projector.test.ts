import { describe, expect, it } from "vitest";
import { projectRuntimeEvents } from "./runtime-event-projector";

describe("runtime event projector", () => {
  it("dedupes by session and seq and projects deltas", () => {
    const views = projectRuntimeEvents([
      { uiSessionId: "s", seq: 1, type: "message.delta", payload: { delta: "hi" } },
      { uiSessionId: "s", seq: 1, type: "message.delta", payload: { delta: "dup" } },
      { uiSessionId: "s", seq: 2, type: "run.completed", payload: {} },
    ]);
    expect(views.get("s")).toEqual({ messages: ["hi"], phase: "completed" });
  });
});
