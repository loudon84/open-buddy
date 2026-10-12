import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createServer } from "node:http";
import { describe, expect, it } from "vitest";
import { HermesClient } from "../../packages/runtime/openbuddy-hermes-client/src/client";
import { RemoteHermesAdapter } from "../../electron/main/runtime/remote-hermes-adapter";

async function serve(handler: (req: import("node:http").IncomingMessage, res: import("node:http").ServerResponse) => void) {
  const server = createServer(handler);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("no port");
  return {
    url: `http://127.0.0.1:${address.port}`,
    close: () => new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve())),
  };
}

describe("P1-03 remote transport", () => {
  it("rejects an incompatible major and keeps the token out of logs", async () => {
    const logs: string[] = [];
    const gateway = await serve((_req, res) => {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ protocolVersion: "2.0" }));
    });
    const adapter = new RemoteHermesAdapter({
      endpoint: gateway.url,
      tokens: { getAccessToken: async () => "super-secret-token", refresh: async () => "super-secret-token" },
      log: (line) => logs.push(line),
    });
    await expect(adapter.connect()).rejects.toThrow(/incompatible protocol major/);
    expect(logs.join("\n")).not.toContain("super-secret-token");
    const portable = readFileSync(resolve("packages/runtime/openbuddy-hermes-client/src/transport.ts"), "utf8");
    expect(portable).not.toMatch(/from ["']electron["']/);
    await gateway.close();
  });

  it("refreshes a 401 once for concurrent calls, does not retry 403, and waits on 429", async () => {
    let current = "stale";
    let refreshes = 0;
    const gateway = await serve((req, res) => {
      const auth = req.headers.authorization;
      if (req.url === "/forbidden") {
        res.writeHead(403);
        res.end("no");
        return;
      }
      if (auth !== "Bearer fresh") {
        res.writeHead(401);
        res.end("unauthorized");
        return;
      }
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ protocolVersion: "1.2", ok: true }));
    });
    const sleeps: number[] = [];
    const client = new HermesClient({
      endpoint: gateway.url,
      tokens: {
        getAccessToken: async () => current,
        refresh: async () => {
          refreshes += 1;
          await new Promise((resolve) => setTimeout(resolve, 20));
          current = "fresh";
          return current;
        },
      },
      log: () => {},
      sleep: async (ms) => {
        sleeps.push(ms);
      },
    });
    const [first, second] = await Promise.all([
      client.transport.request("/v1/capabilities"),
      client.transport.request("/v1/capabilities"),
    ]);
    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(refreshes).toBe(1);

    const forbidden = await client.transport.request("/forbidden");
    expect(forbidden.status).toBe(403);
    expect(refreshes).toBe(1);

    let limitedCalls = 0;
    const limited = await serve((req, res) => {
      limitedCalls += 1;
      if (limitedCalls === 1) {
        res.writeHead(429, { "retry-after": "0" });
        res.end("later");
        return;
      }
      expect(req.headers.authorization).toBe("Bearer fresh");
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ protocolVersion: "1.0" }));
    });
    const retryClient = new HermesClient({
      endpoint: limited.url,
      tokens: { getAccessToken: async () => "fresh", refresh: async () => "fresh" },
      log: () => {},
      sleep: async (ms) => {
        sleeps.push(ms);
      },
    });
    const retried = await retryClient.transport.request("/v1/capabilities");
    expect(retried.status).toBe(200);
    expect(sleeps).toContain(0);
    expect(limitedCalls).toBe(2);
    await gateway.close();
    await limited.close();
  });
});
