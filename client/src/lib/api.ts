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

export interface OrderRecord {
  id: number;
  customerName: string;
  prescriptionCode: string;
  medicineName: string;
  quantity: string;
  status: "Pending" | "Approved" | "In Transit" | "Delivered" | "Issue";
  priority: "High" | "Medium" | "Low";
  assignedTo: string;
  createdAtLabel: string;
}

export interface SaleRecord {
  id: number;
  customerName: string;
  invoiceCode: string;
  medicineName: string;
  units: string;
  totalAmount: string;
  paymentMethod: "Cash" | "Card" | "Mobile" | "Insurance";
  status: "Completed" | "Pending" | "Refunded";
  cashierName: string;
  soldAtLabel: string;
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
  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
    });
  } catch {
    throw new ApiError(
      "Cannot reach the backend API. Make sure the Django server is running, then restart the Vite client.",
      0
    );
  }

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

export async function fetchOrders() {
  return apiRequest<{ orders: OrderRecord[]; stats: DashboardStat[] }>("/orders/");
}

export async function createOrder(
  payload: Omit<OrderRecord, "id">
) {
  const data = await apiRequest<{ order: OrderRecord }>("/orders/create/", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  return data.order;
}

export async function updateOrder(
  id: number,
  payload: Partial<Pick<OrderRecord, "status" | "priority" | "assignedTo">>
) {
  const data = await apiRequest<{ order: OrderRecord }>(`/orders/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });

  return data.order;
}

export async function deleteOrder(id: number) {
  await apiRequest<void>(`/orders/${id}/`, {
    method: "DELETE",
  });
}

export async function fetchSales() {
  return apiRequest<{ sales: SaleRecord[]; stats: DashboardStat[] }>("/sales/");
}

export async function createSale(payload: Omit<SaleRecord, "id">) {
  const data = await apiRequest<{ sale: SaleRecord }>("/sales/create/", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  return data.sale;
}

export async function updateSale(
  id: number,
  payload: Partial<Pick<SaleRecord, "status" | "paymentMethod">>
) {
  const data = await apiRequest<{ sale: SaleRecord }>(`/sales/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });

  return data.sale;
}

export async function deleteSale(id: number) {
  await apiRequest<void>(`/sales/${id}/`, {
    method: "DELETE",
  });
}

export { ApiError };
