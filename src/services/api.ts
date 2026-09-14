import { apiClient } from "./apiClient";
import type { Tables, TablesInsert, TablesUpdate } from "@/types/database";

export type TableName =
  | "tenants" | "branches" | "clients" | "rate_cards" | "vehicles" | "drivers"
  | "bookings" | "trips" | "gps_pings" | "pods" | "invoices" | "invoice_lines"
  | "payments" | "fuel_logs" | "vendors" | "spare_parts" | "job_cards"
  | "documents" | "notifications" | "audit_logs" | "profiles" | "user_roles";

export class DataError extends Error {
  constructor(message: string, readonly code?: string) {
    super(message);
  }
}

export function toDataError(error: any): DataError | null {
  if (!error) return null;
  return new DataError(error.message || "An unexpected error occurred", error.code);
}

export function getEndpointForTable(table: TableName): string {
  switch (table) {
    case "vehicles": return "/fleet/vehicles";
    case "drivers": return "/fleet/drivers";
    case "trips": return "/trips";
    case "bookings": return "/bookings";
    case "invoices": return "/finance/invoices";
    case "invoice_lines": return "/finance/invoices";
    case "payments": return "/finance/invoices";
    case "clients": return "/customers";
    case "vendors": return "/vendors";
    case "fuel_logs": return "/fuel";
    case "job_cards": return "/workshop/job-cards";
    case "documents": return "/documents";
    case "notifications": return "/whatsapp/messages";
    case "gps_pings": return "/tower/vehicles";
    case "audit_logs": return "/tower/exceptions";
    case "pods": return "/pod";
    default: return `/${table}`;
  }
}

export async function selectAll<T extends TableName>(
  table: T,
  build?: (query: any) => any,
): Promise<Tables<T>[]> {
  try {
    const endpoint = getEndpointForTable(table);
    const data = await apiClient.get<Tables<T>[]>(endpoint);
    return (Array.isArray(data) ? data : (data as any)?.data ?? []) as Tables<T>[];
  } catch (err) {
    throw toDataError(err);
  }
}

export async function selectOne<T extends TableName>(table: T, id: string): Promise<Tables<T> | null> {
  try {
    const endpoint = getEndpointForTable(table);
    const data = await apiClient.get<Tables<T>>(`${endpoint}/${id}`);
    return (data as any)?.data ?? data ?? null;
  } catch (err) {
    throw toDataError(err);
  }
}

export async function insertRow<T extends TableName>(table: T, values: TablesInsert<T>): Promise<Tables<T>> {
  try {
    const endpoint = getEndpointForTable(table);
    const data = await apiClient.post<Tables<T>>(endpoint, values);
    return (data as any)?.data ?? data;
  } catch (err) {
    throw toDataError(err);
  }
}

export async function updateRow<T extends TableName>(
  table: T,
  id: string,
  values: TablesUpdate<T>,
): Promise<Tables<T>> {
  try {
    const endpoint = getEndpointForTable(table);
    const data = await apiClient.put<Tables<T>>(`${endpoint}/${id}`, values);
    return (data as any)?.data ?? data;
  } catch (err) {
    throw toDataError(err);
  }
}

export async function archiveRow(table: "vehicles" | "drivers" | "clients", id: string) {
  return updateRow(table, id, { is_archived: true } as never);
}
