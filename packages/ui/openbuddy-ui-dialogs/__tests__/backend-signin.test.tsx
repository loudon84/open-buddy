// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";

const statusMock = vi.fn();
const saveMock = vi.fn();
const loginMock = vi.fn();
const cancelMock = vi.fn();

vi.mock("@/lib/backend-auth/backend-auth-client", () => ({
  backendAuthStatus: (...args: unknown[]) => statusMock(...args),
  backendAuthSaveOrigin: (...args: unknown[]) => saveMock(...args),
  backendAuthLogin: (...args: unknown[]) => loginMock(...args),
  backendAuthCancel: (...args: unknown[]) => cancelMock(...args),
  portalNotices: (view: { needsOrgSetup?: boolean; mustChangePassword?: boolean } | null) => {
    const lines: string[] = [];
    if (view?.needsOrgSetup) lines.push("请到业务门户完成组织设置。");
    if (view?.mustChangePassword) lines.push("请到业务门户修改密码。");
    return lines;
  },
}));

vi.mock("@/lib/platform/electron-api", () => ({
  listenSafe: () => Promise.resolve(() => undefined),
}));

import { BackendSignInDialog } from "../src/BackendSignInDialog";

const signedOut = {
  status: "signed_out" as const,
  origin: "",
  needsOrgSetup: false,
  mustChangePassword: false,
  phase: "idle" as const,
};

describe("BackendSignInDialog", () => {
  beforeEach(() => {
    statusMock.mockReset();
    saveMock.mockReset();
    loginMock.mockReset();
    cancelMock.mockReset();
    statusMock.mockResolvedValue(signedOut);
    saveMock.mockImplementation(async (origin: string) => ({ ok: true, origin }));
    loginMock.mockResolvedValue({ ok: true });
  });

  it("disables login until an origin is saved, then starts login", async () => {
    render(<BackendSignInDialog open onClose={() => undefined} />);
    const button = await screen.findByTestId("backend-signin-primary");
    expect(button).toBeDisabled();
    fireEvent.change(screen.getByTestId("backend-signin-origin"), { target: { value: "https://id.example" } });
    fireEvent.click(button);
    await waitFor(() => expect(loginMock).toHaveBeenCalled());
    expect(saveMock).toHaveBeenCalledWith("https://id.example");
  });

  it("cancels the round while the browser is open", async () => {
    statusMock.mockResolvedValue({ ...signedOut, origin: "https://id.example", phase: "waiting_browser" });
    cancelMock.mockResolvedValue({ ...signedOut, origin: "https://id.example", phase: "idle" });
    render(<BackendSignInDialog open onClose={() => undefined} />);
    const button = await screen.findByTestId("backend-signin-primary");
    expect(button.textContent).toBe("取消");
    fireEvent.click(button);
    await waitFor(() => expect(cancelMock).toHaveBeenCalled());
    expect(loginMock).not.toHaveBeenCalled();
  });

  it("keeps the dialog open with portal notices after a flagged login", async () => {
    statusMock.mockResolvedValue({
      status: "signed_in",
      origin: "https://id.example",
      displayName: "Ada",
      needsOrgSetup: true,
      mustChangePassword: true,
      phase: "idle",
    });
    const onClose = vi.fn();
    render(<BackendSignInDialog open onClose={onClose} />);
    expect(await screen.findByText("请到业务门户完成组织设置。")).toBeTruthy();
    expect(screen.getByText("请到业务门户修改密码。")).toBeTruthy();
    expect(screen.getByTestId("backend-signin-primary").textContent).toBe("关闭");
    fireEvent.click(screen.getByTestId("backend-signin-primary"));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it("unmounts", () => {
    const view = render(<BackendSignInDialog open={false} onClose={() => undefined} />);
    expect(view.container.textContent).toBe("");
    cleanup();
  });
});
