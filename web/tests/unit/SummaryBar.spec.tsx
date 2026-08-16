// @vitest-environment jsdom
/**
 * T132 RED — SummaryBar render test: shows correct counts from PatientSummary prop.
 */
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import SummaryBar from "../../src/app/board/_components/SummaryBar";

describe("SummaryBar", () => {
  it("renders all acuity counts from summary prop", () => {
    render(
      <SummaryBar
        summary={{ total: 10, critical: 2, urgent: 3, stable: 4, discharge_ready: 1 }}
      />,
    );
    expect(screen.getByText("10")).toBeDefined();
    expect(screen.getByText("2")).toBeDefined();
    expect(screen.getByText("3")).toBeDefined();
    expect(screen.getByText("4")).toBeDefined();
    expect(screen.getByText("1")).toBeDefined();
  });

  it("renders with all-zero counts", () => {
    render(
      <SummaryBar
        summary={{ total: 0, critical: 0, urgent: 0, stable: 0, discharge_ready: 0 }}
      />,
    );
    const zeros = screen.getAllByText("0");
    expect(zeros.length).toBeGreaterThanOrEqual(5);
  });

  it("has accessible status role", () => {
    render(
      <SummaryBar summary={{ total: 1, critical: 0, urgent: 0, stable: 1, discharge_ready: 0 }} />,
    );
    expect(screen.getByRole("status")).toBeDefined();
  });
});
