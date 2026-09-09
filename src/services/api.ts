import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

/** Every table the ERP reads or writes through the service layer. */
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

/** Turns database failures into messages a person can act on. */
export function toDataError(error: { message: string; code?: string } | null): DataError | null {
  if (!error) return null;
  const permission =
    error.code === "42501" || /row-level security|permission denied/i.test(error.message);
  return new DataError(
    permission ? "You do not have permission to do this." : error.message,
    error.code,
  );
}

export async function selectAll<T extends TableName>(
  table: T,
  build?: (query: any) => any,
): Promise<Tables<T>[]> {
  let query: any = (supabase.from(table) as any).select("*");
  if (build) query = build(query);
  const { data, error } = await query;
  const err = toDataError(error);
  if (err) throw err;
  return (data ?? []) as Tables<T>[];
}

export async function selectOne<T extends TableName>(table: T, id: string): Promise<Tables<T> | null> {
  const { data, error } = await (supabase.from(table) as any).select("*").eq("id", id).maybeSingle();
  const err = toDataError(error);
  if (err) throw err;
  return (data ?? null) as Tables<T> | null;
}

export async function insertRow<T extends TableName>(table: T, values: TablesInsert<T>): Promise<Tables<T>> {
  const { data, error } = await (supabase.from(table) as any).insert(values).select().single();
  const err = toDataError(error);
  if (err) throw err;
  return data as Tables<T>;
}

export async function updateRow<T extends TableName>(
  table: T,
  id: string,
  values: TablesUpdate<T>,
): Promise<Tables<T>> {
  const { data, error } = await (supabase.from(table) as any).update(values).eq("id", id).select().single();
  const err = toDataError(error);
  if (err) throw err;
  return data as Tables<T>;
}

export async function archiveRow(table: "vehicles" | "drivers" | "clients", id: string) {
  return updateRow(table, id, { is_archived: true } as never);
}
