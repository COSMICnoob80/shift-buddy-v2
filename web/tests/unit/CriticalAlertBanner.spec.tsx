// @vitest-environment jsdom
/**
 * T137 RED — Critical/Warning alert banner tests.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CriticalAlertBanner from "../../src/app/board/_components/CriticalAlertBanner";
import WarningAlertBanner from "../../src/app/board/_components/WarningAlertBanner";
import type { Alert } from "../../src/lib/api";

vi.mock("../../src/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../src/lib/api")>();
  return {
    ...actual,
    acknowledgeAlert: vi.fn().mockResolvedValue({ acknowledged: true, acknowledged_by: "uid", acknowledged_at: "" }),
  };
});

const criticalAlert: Alert = {
  id: "a1",
  patient_id: "p1",
  alert_type: "critical",
  trigger_source: "lab",
  trigger_parameter: "K+",
  trigger_value: 6.2,
  message: "K+ 6.2 mEq/L — Critical hyperkalemia.",
  protocol_link: null,
  acknowledged: false,
  acknowledged_by: null,
  acknowledged_at: null,
  created_at: "2026-01-01T00:00:00Z",
};

const warningAlert: Alert = { ...criticalAlert, id: "a2", alert_type: "warning" };

describe("CriticalAlertBanner", () => {
  it("renders the alert message", () => {
    render(<CriticalAlertBanner alert={criticalAlert} onAcknowledged={vi.fn()} />);
    expect(screen.getByText(/K\+ 6\.2 mEq\/L/)).toBeDefined();
  });

  it("renders Acknowledge button", () => {
    render(<CriticalAlertBanner alert={criticalAlert} onAcknowledged={vi.fn()} />);
    expect(screen.getByRole("button", { name: /acknowledge/i })).toBeDefined();
  });

  it("calls onAcknowledged after button click", async () => {
    const onAck = vi.fn();
    render(<CriticalAlertBanner alert={criticalAlert} onAcknowledged={onAck} />);
    await userEvent.click(screen.getByRole("button", { name: /acknowledge/i }));
    await waitFor(() => expect(onAck).toHaveBeenCalledOnce());
  });
});

describe("WarningAlertBanner", () => {
  it("renders dismiss button", () => {
    render(<WarningAlertBanner alert={warningAlert} onDismiss={vi.fn()} />);
    expect(screen.getByRole("button", { name: /dismiss/i })).toBeDefined();
  });

  it("calls onDismiss when × clicked (local dismiss, no API)", async () => {
    const onDismiss = vi.fn();
    render(<WarningAlertBanner alert={warningAlert} onDismiss={onDismiss} />);
    await userEvent.click(screen.getByRole("button", { name: /dismiss/i }));
    expect(onDismiss).toHaveBeenCalledOnce();
  });
});
