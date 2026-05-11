import type { AppRole } from "../types/roles";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "/api";

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: AppRole;
}

export interface LoginPayload {
  email: string;
  password: string;
  role: AppRole;
}

export interface DashboardStat {
  label: string;
  value: string;
  description: string;
}

export interface AdminUserRecord {
  id: number;
  name: string;
  email: string;
  role: AppRole;
  status: "Active" | "Suspended" | "Pending";
  lastActive: string;
}

export interface ActivityRecord {
  id: number;
  actor: string;
  action: string;
  area: string;
  severity: "High" | "Medium" | "Low";
  time: string;
  reviewed: boolean;
}

export interface HighlightItem {
  title: string;
  text: string;
}

export interface MedicineRecord {
  id: number;
  name: string;
  purchasePrice: string;
  sellingPrice: string;
  quantity: string;
  expiryDate: string;
}

class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const data = (await response.json()) as T & { detail?: string };

  if (!response.ok) {
    throw new ApiError(data.detail ?? "Something went wrong.", response.status);
  }

  return data;
}

export async function loginRequest(payload: LoginPayload): Promise<AuthUser> {
  const data = await apiRequest<{ user: AuthUser }>("/login/", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  return data.user;
}

export async function fetchDashboard(role: AppRole) {
  return apiRequest<{
    stats: DashboardStat[];
    users?: AdminUserRecord[];
    activities?: ActivityRecord[];
    highlights?: HighlightItem[];
  }>(`/dashboard/?role=${encodeURIComponent(role)}`);
}

export async function updateUser(id: number, payload: Partial<Pick<AdminUserRecord, "role" | "status">>) {
  const data = await apiRequest<{ user: AdminUserRecord }>(`/users/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });

  return data.user;
}

export async function updateActivity(id: number, reviewed: boolean) {
  const data = await apiRequest<{ activity: ActivityRecord }>(`/activities/${id}/`, {
    method: "PATCH",
    body: JSON.stringify({ reviewed }),
  });

  return data.activity;
}

export async function fetchMedicines() {
  const data = await apiRequest<{ medicines: MedicineRecord[] }>("/medicines/");
  return data.medicines;
}

export async function createMedicine(payload: Omit<MedicineRecord, "id">) {
  const data = await apiRequest<{ medicine: MedicineRecord }>("/medicines/", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  return data.medicine;
}

export async function updateMedicine(id: number, payload: Omit<MedicineRecord, "id">) {
  const data = await apiRequest<{ medicine: MedicineRecord }>(`/medicines/${id}/`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });

  return data.medicine;
}

export async function deleteMedicine(id: number) {
  await apiRequest<void>(`/medicines/${id}/`, {
    method: "DELETE",
  });
}

export { ApiError };
