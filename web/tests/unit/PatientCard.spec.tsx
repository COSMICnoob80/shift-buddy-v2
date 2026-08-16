// @vitest-environment jsdom
/**
 * T133 RED — PatientCard render test.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PatientCard from "../../src/app/board/_components/PatientCard";
import type { Patient } from "../../src/lib/api";

const basePatient: Patient = {
  id: "p1",
  bed_number: "3A",
  name: "Ali Khan",
  age: 45,
  sex: "male",
  rank_title: null,
  date_of_admission: "2026-01-01",
  provisional_diagnosis: "Hyperkalemia",
  active_problems: [],
  current_medications: [],
  allergies: [],
  acuity: "critical",
  ward: "family",
  status: "admitted",
  assigned_ho: null,
  discharged_at: null,
  condition_at_discharge: null,
  created_by: "uid",
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

describe("PatientCard", () => {
  it("renders bed_number, name, and diagnosis", () => {
    render(<PatientCard patient={basePatient} onClick={vi.fn()} />);
    expect(screen.getByText(/3A/)).toBeDefined();
    expect(screen.getByText(/Ali Khan/)).toBeDefined();
    expect(screen.getByText(/Hyperkalemia/)).toBeDefined();
  });

  it("truncates name at 20 chars", () => {
    const p = { ...basePatient, name: "A very long patient name that exceeds limit" };
    render(<PatientCard patient={p} onClick={vi.fn()} />);
    // truncate("A very long patient name…", 20) → first 20 chars + "…"
    const el = screen.getByText(/A very long patient …/);
    expect(el).toBeDefined();
  });

  it("calls onClick when clicked", async () => {
    const onClick = vi.fn();
    render(<PatientCard patient={basePatient} onClick={onClick} />);
    const btn = screen.getByRole("button");
    await userEvent.click(btn);
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("critical card has red border color in style", () => {
    render(<PatientCard patient={basePatient} onClick={vi.fn()} />);
    const btn = screen.getByRole("button");
    // jsdom normalizes hex to rgb
    expect(btn.style.borderLeftColor).toBe("rgb(239, 68, 68)");
  });
});
