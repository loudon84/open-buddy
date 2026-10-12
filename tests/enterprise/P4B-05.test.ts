import { describe, expect, it } from "vitest";
import { dispatchBrowser } from "../../services/enterprise-browser/src/executor";

describe("P4B-05 browser executor", () => {
  it("refuses CDP and an offline desktop executor", () => {
    expect(dispatchBrowser({ executorOnline: true }).accepted).toBe(true);
    expect(() => dispatchBrowser({ executorOnline: true, cdpUrl: "ws://127.0.0.1:9222" })).toThrow(/cdp/);
    expect(() => dispatchBrowser({ executorOnline: false })).toThrow(/offline/);
  });
});
