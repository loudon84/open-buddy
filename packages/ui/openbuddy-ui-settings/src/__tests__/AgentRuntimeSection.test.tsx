import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AgentRuntimeSection } from "../AgentRuntimeSection";

const invoke = vi.fn();

vi.mock("@/lib/platform/electron-api", () => ({
  invoke: (...args: unknown[]) => invoke(...args),
}));

afterEach(() => {
  cleanup();
  invoke.mockReset();
});

describe("AgentRuntimeSection", () => {
  it("switches to Hermes and leaves Nanobot disabled", async () => {
    invoke.mockImplementation(async (channel: string) => {
      if (channel === "platform-runtime:health") {
        return [
          { id: "pi", name: "Pi Runtime", version: "embedded", status: "healthy", endpoint: "embedded://pi", capabilities: [{ id: "tools", name: "tools" }], active: true },
          { id: "hermes", name: "Hermes Agent", version: "1.0", status: "healthy", endpoint: "http://127.0.0.1:8642", capabilities: [], active: false },
        ];
      }
      return { ok: true };
    });
    render(<AgentRuntimeSection />);
    expect(await screen.findByText("Nanobot")).toBeTruthy();
    expect(screen.getAllByText("unsupported")).toHaveLength(2);
    const nanobot = screen.getByTestId("runtime-switch-nanobot");
    expect(nanobot).toHaveProperty("disabled", true);
    fireEvent.click(nanobot);
    fireEvent.click(screen.getByTestId("runtime-switch-hermes"));
    await waitFor(() => {
      expect(invoke).toHaveBeenCalledWith("platform-runtime:switch", { id: "hermes" });
    });
    expect(invoke.mock.calls.filter((call) => call[0] === "platform-runtime:switch")).toHaveLength(1);
  });
});
