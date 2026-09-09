import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient, type QueryKey } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";
import { DataError, selectAll, selectOne, type TableName } from "./api";

export const keys = {
  list: (table: TableName, scope?: string): QueryKey => ["db", table, scope ?? "all"],
  one: (table: TableName, id: string): QueryKey => ["db", table, "one", id],
};

/** Tenant scoping is enforced by the database, so the client just asks for rows. */
export function useRows<T extends TableName>(
  table: T,
  options?: { scope?: string; build?: (q: any) => any; enabled?: boolean },
) {
  return useQuery({
    queryKey: keys.list(table, options?.scope),
    queryFn: () => selectAll(table, options?.build),
    enabled: options?.enabled ?? true,
    staleTime: 15_000,
  });
}

export function useRow<T extends TableName>(table: T, id: string | undefined) {
  return useQuery({
    queryKey: keys.one(table, id ?? "none"),
    queryFn: () => selectOne(table, id as string),
    enabled: Boolean(id),
  });
}

/** Wraps a workflow call: success toast, human-readable failure, cache refresh. */
export function useWorkflow<TArgs, TResult>(
  run: (args: TArgs) => Promise<TResult>,
  options: { success: string; invalidate?: TableName[] },
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: run,
    onSuccess: () => {
      toast.success(options.success);
      for (const table of options.invalidate ?? []) {
        void qc.invalidateQueries({ queryKey: ["db", table] });
      }
    },
    onError: (error: unknown) => {
      const message = error instanceof DataError ? error.message : "Something went wrong. Please try again.";
      toast.error("Action blocked", { description: message });
    },
  });
}

/** Keeps a table's cached rows fresh from live database changes. */
export function useLiveTable(table: "gps_pings" | "trips" | "bookings" | "notifications") {
  const qc = useQueryClient();
  useEffect(() => {
    const channel = supabase
      .channel(`live-${table}`)
      .on("postgres_changes", { event: "*", schema: "public", table }, () => {
        void qc.invalidateQueries({ queryKey: ["db", table] });
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [table, qc]);
}

export type Vehicle = Tables<"vehicles">;
export type Driver = Tables<"drivers">;
export type Client = Tables<"clients">;
