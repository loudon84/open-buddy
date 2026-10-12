import { describe, expect, it } from "vitest";
import { BrowserRuntime, cdpDebugPort } from "../../services/enterprise-browser/src/runtime.ts";

describe("P4B-01 browser profiles", () => {
  it("keeps a profile inside its tenant and leaves CDP closed", () => {
    const runtime = new BrowserRuntime();
    const profile = runtime.open("tenant-a");
    expect(runtime.read(profile.id, "tenant-a").partition).toBe("persist:tenant-a");
    expect(() => runtime.read(profile.id, "tenant-b")).toThrow(/isolated/);
    expect(cdpDebugPort).toBeNull();
  });
});
