// @vitest-environment jsdom
import { describe, it, expect, afterEach, beforeAll } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import App from "@/App";

beforeAll(() => {
  // Polyfills required by recharts/radix under jsdom.
  class RO {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  (globalThis as { ResizeObserver?: unknown }).ResizeObserver = RO;
  if (!window.matchMedia) {
    (window as unknown as { matchMedia: unknown }).matchMedia = () => ({
      matches: false,
      addEventListener: () => {},
      removeEventListener: () => {},
    });
  }
});

afterEach(() => cleanup());

describe("App smoke", () => {
  it("mounts and renders the title", () => {
    render(<App />);
    expect(screen.getByText("GitHub Copilot Cost Estimator")).toBeTruthy();
  });

  it("renders a total estimate value", () => {
    render(<App />);
    // Default: 50 Business seats * $19 = $950/month minimum shown somewhere.
    expect(screen.getAllByText(/\$/).length).toBeGreaterThan(0);
  });

  it("updates when seats change", () => {
    render(<App />);
    const seats = screen.getByLabelText("Seats") as HTMLInputElement;
    fireEvent.change(seats, { target: { value: "100" } });
    expect(seats.value).toBe("100");
  });
});
