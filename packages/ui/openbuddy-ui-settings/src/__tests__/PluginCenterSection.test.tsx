import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PluginCenterSection } from "../PluginCenterSection";

const invoke = vi.fn();
const register = vi.fn(() => () => undefined);

vi.mock("@/lib/platform/electron-api", () => ({
  invoke: (...args: unknown[]) => invoke(...args),
}));

vi.mock("@/lib/runtime/renderer-plugin-runtime", () => ({
  getRendererPluginRuntime: () => ({ contributions: { register } }),
}));

afterEach(() => {
  cleanup();
  invoke.mockReset();
  register.mockClear();
});

describe("PluginCenterSection", () => {
  it("installs and disables the CRM plugin", async () => {
    const installed = {
      id: "crm-plugin",
      version: "1.0",
      phase: "Running",
      tools: [{ id: "crm.lookupCustomer", title: "查询客户" }],
      connectors: [{ id: "crm", title: "CRM Connector" }],
      ui: [{ label: "CRM" }],
    };
    invoke.mockImplementation(async (channel: string) => {
      if (channel === "platform-plugin:list") return invoke.mock.calls.some((call) => call[0] === "platform-plugin:activate") ? [installed] : [];
      return { ok: true };
    });
    render(<PluginCenterSection />);
    expect(screen.queryByTestId("plugin-row-crm")).toBeNull();
    fireEvent.click(await screen.findByTestId("plugin-install-crm"));
    await waitFor(() => {
      expect(invoke).toHaveBeenCalledWith("platform-plugin:install", { path: "plugins/crm-plugin" });
      expect(invoke).toHaveBeenCalledWith("platform-plugin:activate", { id: "crm-plugin" });
    });
    expect(register).toHaveBeenCalledWith({ kind: "sidebar", id: "crm-plugin", payload: { label: "CRM" } });
    fireEvent.click(await screen.findByTestId("plugin-disable-crm"));
    await waitFor(() => {
      expect(invoke).toHaveBeenCalledWith("platform-plugin:disable", { id: "crm-plugin" });
    });
  });
});
