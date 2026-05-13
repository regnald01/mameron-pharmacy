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

export interface AdminUserUpdatePayload {
  name?: string;
  email?: string;
  password?: string;
  role?: AdminUserRecord["role"];
  status?: AdminUserRecord["status"];
  lastActive?: string;
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

export interface MedicineItemRecord {
  id: number;
  name: string;
}

export interface StockRecord {
  id: number;
  medicineItemId: number;
  medicineName: string;
  totalItems: string;
  stockBalance: string;
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

  const text = await response.text();
  const data = text ? (JSON.parse(text) as T & { detail?: string }) : undefined;

  if (!response.ok) {
    throw new ApiError(
      (data as { detail?: string } | undefined)?.detail ?? "Something went wrong.",
      response.status
    );
  }

  return data as T;
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

export async function updateUser(
  id: number,
  payload: AdminUserUpdatePayload,
  actor?: string
) {
  const data = await apiRequest<{ user: AdminUserRecord }>(`/users/${id}/`, {
    method: "PATCH",
    body: JSON.stringify({ ...payload, actor }),
  });

  return data.user;
}

export async function createUser(
  payload: Omit<AdminUserRecord, "id"> & { password: string },
  actor?: string
) {
  const data = await apiRequest<{ user: AdminUserRecord }>("/users/", {
    method: "POST",
    body: JSON.stringify({ ...payload, actor }),
  });

  return data.user;
}

export async function deleteUser(id: number, actor?: string) {
  await apiRequest<void>(`/users/${id}/`, {
    method: "DELETE",
    body: JSON.stringify({ actor }),
  });
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

export async function fetchMedicineItems() {
  const data = await apiRequest<{ items: MedicineItemRecord[] }>("/items/");
  return data.items;
}

export async function fetchStockRecords() {
  const data = await apiRequest<{ stocks: StockRecord[] }>("/stock/");
  return data.stocks;
}

export async function createMedicine(payload: Omit<MedicineRecord, "id">, actor?: string) {
  const data = await apiRequest<{ medicine: MedicineRecord }>("/medicines/", {
    method: "POST",
    body: JSON.stringify({ ...payload, actor }),
  });

  return data.medicine;
}

export async function updateMedicine(
  id: number,
  payload: Omit<MedicineRecord, "id">,
  actor?: string
) {
  const data = await apiRequest<{ medicine: MedicineRecord }>(`/medicines/${id}/`, {
    method: "PUT",
    body: JSON.stringify({ ...payload, actor }),
  });

  return data.medicine;
}

export async function deleteMedicine(id: number, actor?: string) {
  await apiRequest<void>(`/medicines/${id}/`, {
    method: "DELETE",
    body: JSON.stringify({ actor }),
  });
}

export async function createMedicineItem(
  payload: Omit<MedicineItemRecord, "id">,
  actor?: string
) {
  const data = await apiRequest<{ item: MedicineItemRecord }>("/items/", {
    method: "POST",
    body: JSON.stringify({ ...payload, actor }),
  });

  return data.item;
}

export async function updateMedicineItem(
  id: number,
  payload: Omit<MedicineItemRecord, "id">,
  actor?: string
) {
  const data = await apiRequest<{ item: MedicineItemRecord }>(`/items/${id}/`, {
    method: "PATCH",
    body: JSON.stringify({ ...payload, actor }),
  });

  return data.item;
}

export async function deleteMedicineItem(id: number, actor?: string) {
  await apiRequest<void>(`/items/${id}/`, {
    method: "DELETE",
    body: JSON.stringify({ actor }),
  });
}

export async function saveStockMovement(
  payload: {
    medicineItemId: number;
    quantity: string;
    operation: "add" | "deduct";
    expiryDate?: string;
  },
  actor?: string
) {
  const data = await apiRequest<{ stock: StockRecord }>("/stock/", {
    method: "POST",
    body: JSON.stringify({ ...payload, actor }),
  });

  return data.stock;
}

export async function fetchOrders() {
  return apiRequest<{ orders: OrderRecord[]; stats: DashboardStat[] }>("/orders/");
}

export async function createOrder(
  payload: Omit<OrderRecord, "id">,
  actor?: string
) {
  const data = await apiRequest<{ order: OrderRecord }>("/orders/create/", {
    method: "POST",
    body: JSON.stringify({ ...payload, actor }),
  });

  return data.order;
}

export async function updateOrder(
  id: number,
  payload: Partial<Pick<OrderRecord, "status" | "priority" | "assignedTo">>,
  actor?: string
) {
  const data = await apiRequest<{ order: OrderRecord }>(`/orders/${id}/`, {
    method: "PATCH",
    body: JSON.stringify({ ...payload, actor }),
  });

  return data.order;
}

export async function deleteOrder(id: number, actor?: string) {
  await apiRequest<void>(`/orders/${id}/`, {
    method: "DELETE",
    body: JSON.stringify({ actor }),
  });
}

export async function fetchSales() {
  return apiRequest<{ sales: SaleRecord[]; stats: DashboardStat[] }>("/sales/");
}

export async function createSale(payload: Omit<SaleRecord, "id">, actor?: string) {
  const data = await apiRequest<{ sale: SaleRecord }>("/sales/create/", {
    method: "POST",
    body: JSON.stringify({ ...payload, actor }),
  });

  return data.sale;
}

export async function updateSale(
  id: number,
  payload: Partial<Pick<SaleRecord, "status" | "paymentMethod">>,
  actor?: string
) {
  const data = await apiRequest<{ sale: SaleRecord }>(`/sales/${id}/`, {
    method: "PATCH",
    body: JSON.stringify({ ...payload, actor }),
  });

  return data.sale;
}

export async function deleteSale(id: number, actor?: string) {
  await apiRequest<void>(`/sales/${id}/`, {
    method: "DELETE",
    body: JSON.stringify({ actor }),
  });
}

export { ApiError };
