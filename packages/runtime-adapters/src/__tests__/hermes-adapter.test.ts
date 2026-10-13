import { describe, expect, it } from "vitest";
import { HermesAdapter } from "../hermes-adapter";

const tokens = {
  async getAccessToken() {
    return "token";
  },
  async refresh() {
    return "token";
  },
};

function event(partial: Record<string, unknown>): string {
  return JSON.stringify({
    sessionId: "hs1",
    tenantId: "local",
    workspaceId: "desktop",
    actorId: "desktop",
    agentInstanceId: "hermes-desktop",
    runtimeId: "remote-hermes",
    eventId: "e1",
    seq: 1,
    runId: "run-h",
    occurredAt: "2026-01-01T00:00:00.000Z",
    traceId: "trace-h",
    payload: {},
    type: "message.delta",
    ...partial,
  });
}

function gateway(): typeof fetch {
  return async (input, init) => {
    const url = new URL(String(input));
    const method = init?.method ?? "GET";
    if (url.pathname === "/v1/capabilities") {
      return Response.json({ protocolVersion: "1.0" });
    }
    if (url.pathname === "/v1/sessions" && method === "POST") {
      return Response.json({
        sessionId: "hs1",
        tenantId: "local",
        workspaceId: "desktop",
        actorId: "desktop",
        agentInstanceId: "hermes-desktop",
        runtimeId: "remote-hermes",
        status: "idle",
      });
    }
    if (url.pathname === "/v1/sessions/hs1/messages") {
      return Response.json({ sessionId: "hs1", runId: "run-h", status: "accepted", traceId: "trace-h" });
    }
    if (url.pathname === "/v1/sessions/hs1/events") {
      const body = `data: ${event({ type: "message.delta", payload: { delta: "pong" }, seq: 1 })}\n\ndata: ${event({ type: "run.completed", seq: 2, eventId: "e2" })}\n\n`;
      return new Response(body, { status: 200 });
    }
    return new Response("missing", { status: 404 });
  };
}

describe("HermesAdapter", () => {
  it("uses the gateway client and aggregates SSE text", async () => {
    const adapter = new HermesAdapter({ tokens, fetchImpl: gateway() });
    expect(adapter.endpoint).toBe("http://127.0.0.1:8642");
    await expect(adapter.health()).resolves.toMatchObject({ status: "healthy", version: "1.0" });
    await expect(adapter.chat({ text: "ping" })).resolves.toMatchObject({ sessionId: "hs1", text: "pong", traceId: "trace-h" });
  });

  it("reports unhealthy without throwing when the gateway is down", async () => {
    const fetchImpl: typeof fetch = async () => {
      throw new Error("connect refused");
    };
    const adapter = new HermesAdapter({ tokens, fetchImpl });
    await expect(adapter.health()).resolves.toMatchObject({ status: "unhealthy" });
    await expect(adapter.start()).rejects.toThrow(/connect refused|network|UPSTREAM/);
  });
});
