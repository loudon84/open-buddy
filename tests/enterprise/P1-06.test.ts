import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { reduceRuntime, RuntimePanel } from "../../packages/ui/openbuddy-ui-enterprise/src/runtime-panel.tsx";
import { runtimeShellState } from "../../electron/main/runtime/runtime-coordinator.ts";

describe("P1-06 runtime panel", () => {
  it("distinguishes phases, waits for cancel, and does not fetch Hermes", () => {
    for (const phase of ["accepted", "running", "waiting", "completed"] as const) {
      const html = renderToStaticMarkup(createElement(RuntimePanel, { phase }));
      expect(html).toContain(`data-phase="${phase}"`);
    }
    const pending = reduceRuntime("running", { type: "cancel-requested" });
    expect(pending).toBe("cancel-pending");
    expect(reduceRuntime(pending, { type: "terminal", status: "cancelled" })).toBe("cancelled");
    expect(reduceRuntime("running", { type: "disconnected" })).toBe("disconnected");
    const source = readFileSync(resolve("packages/ui/openbuddy-ui-enterprise/src/runtime-panel.tsx"), "utf8");
    expect(source).not.toContain("fetch(");
    const view = runtimeShellState("running", "endpoint-ref");
    expect(JSON.stringify(view)).not.toContain("token");
  });
});
