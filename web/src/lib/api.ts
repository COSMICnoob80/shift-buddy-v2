import { getToken } from "./session";

const BASE = "/api/v1";

export interface ErrorEnvelope {
  error: string;
  message: string;
}

export interface HealthResponse {
  status: "alive";
  version: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  pmdc_number: string;
  hospital_code: string;
  department: string;
}

export interface RegisterResponse {
  id: string;
  token: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
}

export class ApiError extends Error {
  constructor(
    public readonly envelope: ErrorEnvelope,
    public readonly status: number,
  ) {
    super(envelope.message);
  }
}

async function request<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init?.headers as Record<string, string> | undefined),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE}${path}`, { ...init, headers });

  if (!res.ok) {
    const envelope = (await res.json()) as ErrorEnvelope;
    throw new ApiError(envelope, res.status);
  }

  return res.json() as Promise<T>;
}

export async function health(): Promise<HealthResponse> {
  return request<HealthResponse>("/health");
}

export async function register(body: RegisterRequest): Promise<RegisterResponse> {
  return request<RegisterResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function login(body: LoginRequest): Promise<LoginResponse> {
  return request<LoginResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

// ── Patient board types (mirrors openapi.yaml P1a) ───────────────────────────

export type PatientAcuity = "critical" | "urgent" | "stable" | "discharge_ready";
export type PatientStatus = "admitted" | "discharged" | "transferred" | "expired";
export type PatientWard = "ortho" | "surgical_itc" | "family" | "officer" | "child" | "emergency";
export type MedicationRoute = "iv" | "im" | "sc" | "po" | "pr" | "nebulized" | "topical" | "sublingual";

export interface Medication {
  name: string;
  dose: string;
  route: MedicationRoute;
  frequency: string;
  start_date: string;
  end_date: string | null;
  notes: string | null;
}

export interface Patient {
  id: string;
  bed_number: string;
  name: string;
  age: number;
  sex: "male" | "female";
  rank_title: string | null;
  date_of_admission: string;
  provisional_diagnosis: string;
  active_problems: string[];
  current_medications: Medication[];
  allergies: string[];
  acuity: PatientAcuity;
  ward: PatientWard;
  status: PatientStatus;
  assigned_ho: string | null;
  discharged_at: string | null;
  condition_at_discharge: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface PatientSummary {
  total: number;
  critical: number;
  urgent: number;
  stable: number;
  discharge_ready: number;
}

export interface PatientListResponse {
  patients: Patient[];
  summary: PatientSummary;
  page: number;
  limit: number;
  total_pages: number;
}

export interface VitalSigns {
  id: string;
  patient_id: string;
  heart_rate: number | null;
  systolic_bp: number | null;
  diastolic_bp: number | null;
  temperature: number | null;
  spo2: number | null;
  respiratory_rate: number | null;
  gcs: number | null;
  urine_output: number | null;
  blood_sugar: number | null;
  recorded_at: string;
}

export interface VitalsListResponse {
  vitals: VitalSigns[];
  page: number;
  limit: number;
  total_pages: number;
}

export interface LabResult {
  id: string;
  patient_id: string;
  test_name: string;
  value: number;
  unit: string;
  reference_low: number | null;
  reference_high: number | null;
  is_critical: boolean;
  recorded_at: string;
}

export interface LabListResponse {
  labs: LabResult[];
  page: number;
  limit: number;
  total_pages: number;
}

export interface Alert {
  id: string;
  patient_id: string;
  alert_type: "critical" | "warning";
  trigger_source: "vital" | "lab" | "protocol";
  trigger_parameter: string;
  trigger_value: number;
  message: string;
  protocol_link: string | null;
  acknowledged: boolean;
  acknowledged_by: string | null;
  acknowledged_at: string | null;
  created_at: string;
}

export interface AlertListResponse {
  alerts: Alert[];
  page: number;
  limit: number;
  total_pages: number;
}

export interface AcknowledgeResponse {
  acknowledged: boolean;
  acknowledged_by: string;
  acknowledged_at: string;
}

export interface ShadowSuggestResponse {
  suggestion: string;
  confidence: "deterministic";
  source: "protocol_engine";
  disclaimer: "SHADOW MODE — advisory only";
  protocol: string | null;
  severity: string | null;
}

// ── Patient board fetch functions ─────────────────────────────────────────────

export interface ListPatientsParams {
  status?: PatientStatus;
  sort?: "acuity";
  ward?: PatientWard;
  acuity?: PatientAcuity;
  page?: number;
  limit?: number;
}

export async function listPatients(params: ListPatientsParams = {}): Promise<PatientListResponse> {
  const qs = new URLSearchParams();
  if (params.status) qs.set("status", params.status);
  if (params.sort) qs.set("sort", params.sort);
  if (params.ward) qs.set("ward", params.ward);
  if (params.acuity) qs.set("acuity", params.acuity);
  if (params.page) qs.set("page", String(params.page));
  if (params.limit) qs.set("limit", String(params.limit));
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  return request<PatientListResponse>(`/patients${suffix}`);
}

export async function getPatient(id: string): Promise<Patient> {
  return request<Patient>(`/patients/${id}`);
}

export async function listVitals(patientId: string, page = 1, limit = 5): Promise<VitalsListResponse> {
  return request<VitalsListResponse>(`/patients/${patientId}/vitals?page=${page}&limit=${limit}`);
}

export async function listLabs(patientId: string, testName?: string): Promise<LabListResponse> {
  const qs = testName ? `?test_name=${encodeURIComponent(testName)}` : "";
  return request<LabListResponse>(`/patients/${patientId}/labs${qs}`);
}

export async function listAlerts(
  patientId: string,
  acknowledged?: boolean,
): Promise<AlertListResponse> {
  const qs = acknowledged !== undefined ? `?acknowledged=${acknowledged}` : "";
  return request<AlertListResponse>(`/patients/${patientId}/alerts${qs}`);
}

export async function acknowledgeAlert(alertId: string): Promise<AcknowledgeResponse> {
  return request<AcknowledgeResponse>(`/alerts/${alertId}/acknowledge`, { method: "POST" });
}

export async function getShadowSuggest(
  patientId: string,
  context = "vitals",
): Promise<ShadowSuggestResponse> {
  return request<ShadowSuggestResponse>(
    `/shadow/suggest?patient_id=${patientId}&context=${context}`,
  );
}
