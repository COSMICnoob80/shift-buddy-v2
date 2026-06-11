/**
 * T131 RED — Unit tests for board API fetch functions (mock fetch).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { PatientListResponse, VitalsListResponse, LabListResponse, AlertListResponse } from "../../src/lib/api";

// Mock session token before importing api functions
vi.mock("../../src/lib/session", () => ({ getToken: () => "test-token" }));

// Import after mock is set up
const { listPatients, getPatient, listVitals, listLabs, listAlerts, acknowledgeAlert } =
  await import("../../src/lib/api");

const mockListResponse: PatientListResponse = {
  patients: [],
  summary: { total: 0, critical: 0, urgent: 0, stable: 0, discharge_ready: 0 },
  page: 1,
  limit: 20,
  total_pages: 0,
};

function mockFetch(body: unknown, status = 200): void {
  global.fetch = vi.fn().mockResolvedValueOnce({
    ok: status < 400,
    status,
    json: async () => body,
  } as unknown as Response);
}

beforeEach(() => { vi.restoreAllMocks(); });

describe("listPatients", () => {
  it("calls /api/v1/patients with status+sort params", async () => {
    mockFetch(mockListResponse);
    const result = await listPatients({ status: "admitted", sort: "acuity" });
    expect(result.patients).toEqual([]);
    expect(result.summary.total).toBe(0);
    const call = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit];
    expect(call[0]).toContain("/patients");
    expect(call[0]).toContain("status=admitted");
    expect(call[0]).toContain("sort=acuity");
  });

  it("includes Authorization header", async () => {
    mockFetch(mockListResponse);
    await listPatients();
    const call = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit];
    expect((call[1]?.headers as Record<string, string>)?.["Authorization"]).toBe("Bearer test-token");
  });
});

describe("getPatient", () => {
  it("calls /api/v1/patients/:id", async () => {
    const patient = { id: "abc-123", name: "Test Patient" };
    mockFetch(patient);
    const result = await getPatient("abc-123");
    expect(result.id).toBe("abc-123");
    const call = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit];
    expect(call[0]).toContain("/patients/abc-123");
  });
});

describe("listVitals", () => {
  it("calls /patients/:id/vitals", async () => {
    const resp: VitalsListResponse = { vitals: [], page: 1, limit: 5, total_pages: 0 };
    mockFetch(resp);
    await listVitals("pid-1");
    const call = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit];
    expect(call[0]).toContain("/patients/pid-1/vitals");
  });
});

describe("listLabs", () => {
  it("calls /patients/:id/labs", async () => {
    const resp: LabListResponse = { labs: [], page: 1, limit: 20, total_pages: 0 };
    mockFetch(resp);
    await listLabs("pid-1");
    const call = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit];
    expect(call[0]).toContain("/patients/pid-1/labs");
  });

  it("appends test_name filter when provided", async () => {
    const resp: LabListResponse = { labs: [], page: 1, limit: 20, total_pages: 0 };
    mockFetch(resp);
    await listLabs("pid-1", "K+");
    const call = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit];
    expect(call[0]).toContain("test_name=K");
  });
});

describe("listAlerts", () => {
  it("calls /patients/:id/alerts", async () => {
    const resp: AlertListResponse = { alerts: [], page: 1, limit: 20, total_pages: 0 };
    mockFetch(resp);
    await listAlerts("pid-1", false);
    const call = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit];
    expect(call[0]).toContain("/patients/pid-1/alerts?acknowledged=false");
  });
});

describe("acknowledgeAlert", () => {
  it("calls POST /alerts/:id/acknowledge", async () => {
    const resp = { acknowledged: true, acknowledged_by: "uid", acknowledged_at: "2026-01-01T00:00:00Z" };
    mockFetch(resp);
    const result = await acknowledgeAlert("alert-id");
    expect(result.acknowledged).toBe(true);
    const call = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit];
    expect(call[0]).toContain("/alerts/alert-id/acknowledge");
    expect(call[1]?.method).toBe("POST");
  });
});
