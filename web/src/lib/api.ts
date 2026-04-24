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
