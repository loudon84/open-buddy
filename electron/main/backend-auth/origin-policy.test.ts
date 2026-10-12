import { describe, expect, it } from "vitest";
import { parseBackendOrigin } from "./origin-policy";

describe("parseBackendOrigin", () => {
  it("accepts https origins and strips a trailing slash", () => {
    expect(parseBackendOrigin("https://example.com")).toEqual({ ok: true, origin: "https://example.com" });
    expect(parseBackendOrigin(" https://example.com:8443/ ")).toEqual({ ok: true, origin: "https://example.com:8443" });
    expect(parseBackendOrigin("https://example.com/")).toEqual({ ok: true, origin: "https://example.com" });
  });

  it("accepts http only for loopback and private IPv4", () => {
    expect(parseBackendOrigin("http://127.0.0.1:4510")).toEqual({ ok: true, origin: "http://127.0.0.1:4510" });
    expect(parseBackendOrigin("http://localhost:4510")).toEqual({ ok: true, origin: "http://localhost:4510" });
    expect(parseBackendOrigin("http://10.1.2.3:4510").ok).toBe(true);
    expect(parseBackendOrigin("http://172.16.0.1").ok).toBe(true);
    expect(parseBackendOrigin("http://172.31.255.255").ok).toBe(true);
    expect(parseBackendOrigin("http://192.168.102.247:4510").ok).toBe(true);
  });

  it("rejects public http, userinfo, path, and query", () => {
    expect(parseBackendOrigin("http://8.8.8.8").ok).toBe(false);
    expect(parseBackendOrigin("http://example.com").ok).toBe(false);
    expect(parseBackendOrigin("http://172.15.0.1").ok).toBe(false);
    expect(parseBackendOrigin("http://172.32.0.1").ok).toBe(false);
    expect(parseBackendOrigin("http://[::1]:4510").ok).toBe(false);
    expect(parseBackendOrigin("https://user:pass@example.com").ok).toBe(false);
    expect(parseBackendOrigin("https://example.com/api").ok).toBe(false);
    expect(parseBackendOrigin("https://example.com?x=1").ok).toBe(false);
    expect(parseBackendOrigin("").ok).toBe(false);
    expect(parseBackendOrigin("not a url").ok).toBe(false);
  });
});
