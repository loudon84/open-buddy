import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { KnowledgePanel } from "../../plugins/knowledge/src/panel.tsx";
import { KnowledgePlugin } from "../../plugins/knowledge/src/index.ts";
import { localDocuments } from "../../plugins/knowledge/src/provider.ts";

describe("P4A-02 knowledge provider", () => {
  it("keeps same-titled documents inside the caller tenant and hides the endpoint", async () => {
    const plugin = new KnowledgePlugin({
      async list(tenantId) {
        if (tenantId === "down") throw new Error("backend unavailable");
        return [
          { id: "a", tenantId: "tenant-a", title: "policy", version: 1 },
          { id: "b", tenantId: "tenant-b", title: "policy", version: 1 },
        ].filter((document) => document.tenantId === tenantId);
      },
    });
    await expect(plugin.list({ tenantId: "tenant-a", grant: true })).rejects.toThrow(/disabled/);
    plugin.enable();
    await expect(plugin.list({ tenantId: "tenant-a", grant: false })).rejects.toThrow(/acl/);
    const view = await plugin.list({ tenantId: "tenant-a", grant: true });
    expect(view.titles).toEqual(["policy"]);
    const other = await plugin.list({ tenantId: "tenant-b", grant: true });
    expect(other.titles).toEqual(["policy"]);
    expect(JSON.stringify(view)).not.toContain("token");
    expect(JSON.stringify(view)).not.toContain("http");
    await expect(plugin.list({ tenantId: "down", grant: true })).rejects.toThrow(/unavailable/);
    plugin.disable();
    await expect(plugin.list({ tenantId: "tenant-a", grant: true })).rejects.toThrow(/disabled/);
    expect(localDocuments("local:install").map((document) => document.title)).toEqual(["desktop-notes"]);
    const html = renderToStaticMarkup(createElement(KnowledgePanel, { view }));
    expect(html).toContain("policy");
    expect(html).not.toContain("secret");
  });
});
