// @vitest-environment jsdom
/**
 * T142 RED — ShadowCard render test.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import ShadowCard from "../../src/app/board/_components/ShadowCard";
import type { ShadowSuggestResponse } from "../../src/lib/api";

vi.mock("swr", () => ({
  default: vi.fn((key: string | null, _fetcher: unknown) => {
    if (key === null) return { data: undefined };
    const data: ShadowSuggestResponse = {
      suggestion: "IV Calcium Gluconate — STAT",
      confidence: "deterministic",
      source: "protocol_engine",
      disclaimer: "SHADOW MODE — advisory only",
      protocol: "hyperkalemia",
      severity: "severe",
    };
    return { data };
  }),
}));

describe("ShadowCard", () => {
  it("renders disclaimer text verbatim when enabled", () => {
    render(<ShadowCard patientId="p1" enabled={true} />);
    expect(screen.getByText("SHADOW MODE — advisory only")).toBeDefined();
  });

  it("renders suggestion text", () => {
    render(<ShadowCard patientId="p1" enabled={true} />);
    expect(screen.getByText(/IV Calcium Gluconate/)).toBeDefined();
  });

  it("renders SHADOW badge", () => {
    render(<ShadowCard patientId="p1" enabled={true} />);
    expect(screen.getByText("SHADOW")).toBeDefined();
  });

  it("renders nothing when disabled (feature flag off)", () => {
    const { container } = render(<ShadowCard patientId="p1" enabled={false} />);
    expect(container.firstChild).toBeNull();
  });
});
