import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { EnterpriseLoginPanel } from "../EnterpriseLoginPanel";

const status = vi.fn();
const save = vi.fn();
const testConnection = vi.fn();
const refreshIdentity = vi.fn();

vi.mock("@/lib/backend-auth/backend-auth-client", () => ({
  backendAuthStatus: () => status(),
  backendAuthSaveOrigin: (origin: string) => save(origin),
  backendAuthTestConnection: (origin: string) => testConnection(origin),
}));
vi.mock("@/lib/identity/identity-client", () => ({
  identityRefresh: () => refreshIdentity(),
}));

afterEach(() => {
  cleanup();
  status.mockReset();
  save.mockReset();
  testConnection.mockReset();
  refreshIdentity.mockReset();
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

  it("disables the identity refresh button while the request is in flight", async () => {
    status.mockResolvedValue({ origin: "https://id.example", status: "signed_in", phase: "idle", needsOrgSetup: false, mustChangePassword: false });
    let release: (value: { ok: true; context: null }) => void = () => undefined;
    refreshIdentity.mockReturnValue(new Promise((resolve) => { release = resolve; }));
    render(<EnterpriseLoginPanel />);
    await screen.findByTestId("enterprise-login-origin");
    fireEvent.click(screen.getByTestId("enterprise-login-refresh"));
    expect(screen.getByTestId("enterprise-login-refresh")).toBeDisabled();
    expect(screen.getByTestId("enterprise-login-refresh")).toHaveTextContent("刷新中…");
    release({ ok: true, context: null });
    expect(await screen.findByTestId("enterprise-login-refresh-note")).toHaveTextContent("已刷新");
    expect(screen.getByTestId("enterprise-login-refresh")).not.toBeDisabled();
  });

  it("shows the identity refresh error", async () => {
    status.mockResolvedValue({ origin: "https://id.example", status: "signed_out", phase: "idle", needsOrgSetup: false, mustChangePassword: false });
    refreshIdentity.mockResolvedValue({ ok: false, error: "当前账号无权限访问企业资源" });
    render(<EnterpriseLoginPanel />);
    await screen.findByTestId("enterprise-login-origin");
    fireEvent.click(screen.getByTestId("enterprise-login-refresh"));
    expect(await screen.findByTestId("enterprise-login-refresh-error")).toHaveTextContent("当前账号无权限访问企业资源");
  });
});
