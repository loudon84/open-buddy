import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { BrowserRuntime } from "../../services/enterprise-browser/src/runtime";
import { navigate } from "../../services/enterprise-browser/src/domain-policy";
import { dispatchBrowser } from "../../services/enterprise-browser/src/executor";

describe("P4B-06 browser acceptance", () => {
  it("keeps the fixture chain closed to real sites", () => {
    const runtime = new BrowserRuntime();
    runtime.open("tenant-a");
    expect(navigate("https://example.com", [{ registrableDomain: "example.com", ports: [443] }]).host).toBe("example.com");
    expect(dispatchBrowser({ executorOnline: true }).accepted).toBe(true);
    expect(readFileSync("scripts/enterprise/browser-smoke.mjs", "utf8")).toContain("process.exit(2)");
  });
});
