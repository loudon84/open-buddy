import { describe, expect, it, vi } from "vitest";
import { startEnterpriseLogin } from "../start-enterprise-login";

describe("startEnterpriseLogin", () => {
  it("starts login when an origin is already saved", async () => {
    const login = vi.fn(async () => ({ ok: true as const }));
    const openEnterpriseSettings = vi.fn();
    const toast = vi.fn();
    await startEnterpriseLogin({ origin: "https://id.example", login, openEnterpriseSettings, toast });
    expect(login).toHaveBeenCalledTimes(1);
    expect(openEnterpriseSettings).not.toHaveBeenCalled();
    expect(toast).not.toHaveBeenCalled();
  });

  it("opens enterprise login settings when the origin is empty", async () => {
    const login = vi.fn();
    const openEnterpriseSettings = vi.fn();
    await startEnterpriseLogin({ origin: "", login, openEnterpriseSettings, toast: vi.fn() });
    expect(openEnterpriseSettings).toHaveBeenCalledTimes(1);
    expect(login).not.toHaveBeenCalled();
  });
});
