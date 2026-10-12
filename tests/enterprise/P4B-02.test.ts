import { describe, expect, it } from "vitest";
import { navigate } from "../../services/enterprise-browser/src/domain-policy";

const rules = [{ registrableDomain: "example.com", ports: [443] }];

describe("P4B-02 domain policy", () => {
  it("allows a listed registrable domain and rejects literals and lookalikes", () => {
    expect(navigate("https://app.example.com/path", rules).host).toBe("app.example.com");
    expect(() => navigate("http://127.0.0.1/", rules)).toThrow(/literal/);
    expect(() => navigate("https://example.com.evil.net/", rules)).toThrow(/domain/);
    expect(() => navigate("https://user:secret@example.com/", rules)).toThrow(/credential/);
    expect(() => navigate("https://example.com:8443/", rules)).toThrow(/port/);
  });
});
