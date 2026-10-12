import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  EnterpriseRuntimeController,
  resolveGatewayEndpoint,
  type EnterpriseRuntimeEmission,
} from "../../electron/main/runtime/enterprise-runtime-controller";
import { startGateway } from "../../services/hermes-agent-gateway/src/server";
import { fakeHermes, gatewayTokens, registerInstance } from "./helpers/fake-hermes";

function waitFor(emitted: EnterpriseRuntimeEmission[], test: (item: EnterpriseRuntimeEmission) => boolean, timeoutMs = 10_000) {
  return new Promise<void>((resolve, reject) => {
    const started = Date.now();
    const tick = () => {
      if (emitted.some(test)) return resolve();
      if (Date.now() - started > timeoutMs) return reject(new Error("timed out waiting for emission"));
      setTimeout(tick, 10);
    };
    tick();
  });
}

const signedIn = { tenantId: "t1", actorId: "alice" };
const tokens = { getAccessToken: async () => "member", refresh: async () => "member" };

describe("enterprise runtime controller in the desktop main process", () => {
  it("accepts https gateways and plain http on loopback or a private LAN", () => {
    expect(resolveGatewayEndpoint("https://gw.example.com/base")).toBe("https://gw.example.com");
    expect(resolveGatewayEndpoint("http://127.0.0.1:8080")).toBe("http://127.0.0.1:8080");
    expect(resolveGatewayEndpoint("http://192.168.102.247:4510")).toBe("http://192.168.102.247:4510");
    expect(resolveGatewayEndpoint("http://10.1.2.3:4510")).toBe("http://10.1.2.3:4510");
    expect(resolveGatewayEndpoint("http://8.8.8.8")).toBeUndefined();
    expect(resolveGatewayEndpoint("http://gw.example.com")).toBeUndefined();
    expect(resolveGatewayEndpoint("https://user:pw@gw.example.com")).toBeUndefined();
    expect(resolveGatewayEndpoint("file:///etc/passwd")).toBeUndefined();
    expect(resolveGatewayEndpoint("  ")).toBeUndefined();
  });

  it("stays off without a gateway URL and refuses a signed-out user", async () => {
    const off = new EnterpriseRuntimeController({ endpoint: undefined, identity: () => signedIn, tokens, emit: () => {} });
    expect(off.status()).toEqual({ enabled: false, connected: false, tenantId: null });
    await expect(off.connect()).rejects.toMatchObject({ code: "UNSUPPORTED_CAPABILITY" });

    const signedOut = new EnterpriseRuntimeController({ endpoint: "http://127.0.0.1:1", identity: () => null, tokens, emit: () => {} });
    await expect(signedOut.connect()).rejects.toMatchObject({ code: "UNAUTHENTICATED" });
  });

  it("drives create, stream, approval, and cancel through the gateway and emits only renderer-safe data", async () => {
    const dir = await mkdtemp(join(tmpdir(), "ob-ctl-"));
    const hermes = await fakeHermes();
    const gateway = await startGateway({
      dbPath: join(dir, "routes.sqlite"),
      verify: (headers) => gatewayTokens[String(headers.authorization ?? "").replace(/^Bearer /, "")] ?? null,
    });
    expect((await registerInstance(gateway, hermes.url)).status).toBe(201);

    const emitted: EnterpriseRuntimeEmission[] = [];
    let identity: { tenantId: string; actorId: string } = signedIn;
    const controller = new EnterpriseRuntimeController({
      endpoint: gateway.url,
      identity: () => identity,
      tokens,
      emit: (item) => emitted.push(item),
      pollIntervalMs: 5,
    });
    expect(await controller.connect()).toEqual({ enabled: true, connected: true, tenantId: "t1" });

    const { sessionId } = await controller.createSession({ agentInstanceId: "inst-1", workspaceId: "w1" });
    expect(sessionId).toMatch(/^gws_/);
    await expect(controller.send({ sessionId: "gws_forged", text: "x" })).rejects.toMatchObject({ code: "NOT_FOUND" });

    controller.subscribe({ sessionId, afterSeq: 0 });
    const first = await controller.send({ sessionId, text: "update crm", requestId: "send-1" });
    expect(first.runId).toBe("run-1");
    expect((await controller.send({ sessionId, text: "update crm", requestId: "send-1" })).runId).toBe("run-1");

    await waitFor(emitted, (item) => item.kind === "event" && item.event.type === "approval.required");
    await expect(
      controller.decide({ sessionId, approvalId: "ap-1", decision: "approve", actionDigest: "tampered" }),
    ).rejects.toMatchObject({ code: "CONFLICT" });
    await controller.decide({ sessionId, approvalId: "ap-1", decision: "approve", actionDigest: "digest-1" });
    await waitFor(emitted, (item) => item.kind === "event" && item.event.type === "run.completed");

    const second = await controller.send({ sessionId, text: "again" });
    await controller.cancel({ sessionId, runId: second.runId });
    await waitFor(emitted, (item) => item.kind === "event" && item.event.type === "run.cancelled");
    controller.unsubscribe(sessionId);

    const seqs = emitted.flatMap((item) => (item.kind === "event" ? [item.event.seq] : []));
    expect(seqs).toEqual([...seqs].sort((a, b) => a - b));
    expect(new Set(seqs).size).toBe(seqs.length);
    expect(JSON.stringify(emitted)).not.toContain(hermes.url);
    expect(JSON.stringify(emitted)).not.toMatch(/Bearer|member"/);

    identity = { tenantId: "t2", actorId: "alice" };
    await expect(controller.send({ sessionId, text: "after switch" })).rejects.toMatchObject({ code: "NOT_FOUND" });
    identity = signedIn;
    await expect(controller.send({ sessionId, text: "switched back" })).rejects.toMatchObject({ code: "NOT_FOUND" });

    await controller.dispose();
    await gateway.close();
    await hermes.close();
    await rm(dir, { recursive: true, force: true });
  }, 30_000);
});
