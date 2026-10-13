import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { EnterpriseLoginPanel } from "../EnterpriseLoginPanel";

const status = vi.fn();
const save = vi.fn();
const testConnection = vi.fn();

vi.mock("@/lib/backend-auth/backend-auth-client", () => ({
  backendAuthStatus: () => status(),
  backendAuthSaveOrigin: (origin: string) => save(origin),
  backendAuthTestConnection: (origin: string) => testConnection(origin),
}));

afterEach(() => {
  cleanup();
  status.mockReset();
  save.mockReset();
  testConnection.mockReset();
});

describe("EnterpriseLoginPanel", () => {
  it("saves and probes without letting a failed probe change the origin", async () => {
    status.mockResolvedValue({ origin: "https://id.example", status: "signed_out", phase: "idle", needsOrgSetup: false, mustChangePassword: false });
    save.mockResolvedValue({ ok: false, error: "根地址无效" });
    testConnection.mockResolvedValue({ ok: false, error: "连接失败" });
    render(<EnterpriseLoginPanel />);
    const input = await screen.findByTestId("enterprise-login-origin") as HTMLInputElement;
    await waitFor(() => expect(input.value).toBe("https://id.example"));
    fireEvent.change(input, { target: { value: "http://8.8.8.8/api" } });
    fireEvent.click(screen.getByTestId("enterprise-login-save"));
    await waitFor(() => expect(save).toHaveBeenCalledWith("http://8.8.8.8/api"));
    await waitFor(() => expect(input.value).toBe("https://id.example"));
    fireEvent.click(screen.getByTestId("enterprise-login-test"));
    await waitFor(() => expect(testConnection).toHaveBeenCalledWith("https://id.example"));
    expect(await screen.findByTestId("enterprise-login-probe")).toHaveTextContent("连接失败");
    expect(save).toHaveBeenCalledTimes(1);
  });
});
