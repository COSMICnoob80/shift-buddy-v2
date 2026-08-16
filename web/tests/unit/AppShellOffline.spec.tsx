// @vitest-environment jsdom
/**
 * T144 RED — AppShell offline banner test.
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import AppShell from "../../src/components/AppShell";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

afterEach(() => {
  // Reset online status
  Object.defineProperty(navigator, "onLine", { configurable: true, value: true });
});

describe("AppShell offline indicator", () => {
  it("shows offline banner when navigator.onLine is false", async () => {
    Object.defineProperty(navigator, "onLine", { configurable: true, value: false });
    await act(async () => {
      render(<AppShell><div>content</div></AppShell>);
    });
    expect(screen.getByText(/Offline — showing cached data/i)).toBeDefined();
  });

  it("does not show banner when online", async () => {
    Object.defineProperty(navigator, "onLine", { configurable: true, value: true });
    await act(async () => {
      render(<AppShell><div>content</div></AppShell>);
    });
    expect(screen.queryByText(/Offline/i)).toBeNull();
  });
});
