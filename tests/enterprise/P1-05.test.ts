import { describe, expect, it } from "vitest";
import { SessionCoordinator } from "../../electron/main/runtime/session-coordinator.ts";

describe("P1-05 session projection", () => {
  it("drops duplicate seq, fills gaps from a snapshot, and keeps runtimes apart", () => {
    const coordinator = new SessionCoordinator();
    coordinator.open("local-1", "local-pi:install-1");
    coordinator.open("remote-1", "remote-hermes:inst-a");

    expect(coordinator.apply({ sessionId: "local-1", runtimeId: "local-pi:install-1", seq: 1, type: "message.delta", payload: "a" }).applied).toBe(true);
    expect(coordinator.apply({ sessionId: "local-1", runtimeId: "local-pi:install-1", seq: 1, type: "message.delta", payload: "a" }).applied).toBe(false);
    expect(coordinator.projection.text("local-1")).toBe("a");

    expect(coordinator.apply({ sessionId: "local-1", runtimeId: "local-pi:install-1", seq: 3, type: "message.delta", payload: "c" }).gap).toBe(true);
    expect(coordinator.projection.text("local-1")).toBe("a");
    coordinator.apply({ sessionId: "local-1", runtimeId: "local-pi:install-1", seq: 2, type: "message.delta", payload: "b" });
    coordinator.apply({ sessionId: "local-1", runtimeId: "local-pi:install-1", seq: 3, type: "message.delta", payload: "c" });
    expect(coordinator.projection.text("local-1")).toBe("abc");

    coordinator.onStreamExpired("remote-1", { cursor: 4, text: "snap" });
    expect(coordinator.projection.text("remote-1")).toBe("snap");
    expect(coordinator.apply({ sessionId: "remote-1", runtimeId: "remote-hermes:inst-a", seq: 4, type: "message.delta", payload: "x" }).applied).toBe(false);
    expect(coordinator.projection.text("remote-1")).toBe("snap");

    expect(coordinator.apply({ sessionId: "local-1", runtimeId: "remote-hermes:inst-a", seq: 4, type: "message.delta", payload: "z" }).mixed).toBe(true);
    expect(coordinator.projection.text("local-1")).toBe("abc");
    coordinator.open("local-2", "remote-hermes:inst-a");
    expect(coordinator.projection.runtimeId("local-1")).toBe("local-pi:install-1");
    expect(coordinator.projection.idsForRuntime("local-pi:install-1")).toEqual(["local-1"]);
    expect(coordinator.projection.idsForRuntime("remote-hermes:inst-a")).toEqual(["remote-1", "local-2"]);
  });
});
