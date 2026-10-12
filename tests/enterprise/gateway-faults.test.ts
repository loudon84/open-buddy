import { createServer } from "node:http";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { startGateway } from "../../services/hermes-agent-gateway/src/server";

describe("P1-07 gateway faults", () => {
  it("surfaces an upstream 500 without calling it a success", async () => {
    const dir = await mkdtemp(join(tmpdir(), "ob-fault-"));
    const upstream = createServer((_req, res) => {
      res.writeHead(500, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: "boom" }));
    });
    await new Promise<void>((resolve) => upstream.listen(0, "127.0.0.1", resolve));
    const address = upstream.address();
    if (!address || typeof address === "string") throw new Error("no port");
    const gateway = await startGateway({
      dbPath: join(dir, "routes.json"),
      verify: () => ({ tenantId: "tenant-a", workspaceId: "w", actorId: "a", role: "tenant-admin" }),
    });
    await gateway.fetch("/v1/agent-instances", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        agentInstanceId: "inst-a",
        upstreamUrl: `http://127.0.0.1:${address.port}`,
        capabilities: { resume: true, cancel: true, approvals: true, tools: true, tasks: false, artifacts: false },
      }),
    });
    const created = await gateway.fetch("/v1/sessions", {
      method: "POST",
      headers: { "content-type": "application/json", "idempotency-key": "create" },
      body: JSON.stringify({ agentInstanceId: "inst-a" }),
    });
    expect(created.status).toBe(502);
    expect(await created.json()).toMatchObject({ error: { code: "UPSTREAM_UNAVAILABLE" } });
    await gateway.close();
    await new Promise<void>((resolve, reject) => upstream.close((error) => error ? reject(error) : resolve()));
    await rm(dir, { recursive: true, force: true });
  });
});
