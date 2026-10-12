import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { applyResponse, createScope, goOffline, switchTenant } from "../../packages/ui/openbuddy-ui-enterprise/src/workspace-shell.ts";
import { WorkspaceShell } from "../../packages/ui/openbuddy-ui-enterprise/src/workspace-navigation.tsx";

describe("P2-05 workspace shell", () => {
  it("clears the old tenant cache and drops a stale response", () => {
    const first = applyResponse(createScope("tenant-a"), { tenantId: "tenant-a", item: "old" });
    const next = switchTenant(first, "tenant-b", "background");
    expect(next.items).toEqual([]);
    expect(next.activeRun).toBe("background");
    const stale = applyResponse(next, { tenantId: "tenant-a", item: "late" });
    expect(stale.items).toEqual([]);
    const fresh = applyResponse(stale, { tenantId: "tenant-b", item: "new" });
    const offline = goOffline(fresh, "2026-10-12T00:00:00Z");
    const html = renderToStaticMarkup(createElement(WorkspaceShell, { scope: offline }));
    expect(html).toContain("data-tenant=\"tenant-b\"");
    expect(html).toContain("离线只读 2026-10-12T00:00:00Z");
    expect(html).not.toContain("old");
    const source = readFileSync(resolve("packages/ui/openbuddy-ui-enterprise/src/workspace-shell.ts"), "utf8");
    expect(source).not.toContain("token");
    expect(source).not.toContain("jsonl");
  });
});
