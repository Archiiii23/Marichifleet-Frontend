import { Search, X } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { EmptyState, TableSkeleton } from "./primitives";

export interface Column<T> {
  key: string;
  header: string;
  cell: (row: T) => ReactNode;
  sortValue?: (row: T) => string | number;
  className?: string;
  hideOnMobile?: boolean;
}

export interface Chip {
  id: string;
  label: string;
  test: (row: never) => boolean;
}

export function DataTable<T extends { id: string }>({
  rows,
  columns,
  searchKeys,
  chips,
  onRowClick,
  bulkActions,
  loading,
  emptyTitle,
  emptyMessage,
  emptyAction,
  toolbar,
}: {
  rows: T[];
  columns: Column<T>[];
  searchKeys: (row: T) => string;
  chips?: Array<{ id: string; label: string; test: (row: T) => boolean }>;
  onRowClick?: (row: T) => void;
  bulkActions?: Array<{ label: string; run: (ids: string[]) => void }>;
  loading?: boolean;
  emptyTitle: string;
  emptyMessage: string;
  emptyAction?: { label: string; onAction: () => void };
  toolbar?: ReactNode;
}) {
  const [q, setQ] = useState("");
  const [chip, setChip] = useState<string | null>(null);
  const [sort, setSort] = useState<{ key: string; dir: 1 | -1 } | null>(null);
  const [selected, setSelected] = useState<string[]>([]);

  const filtered = useMemo(() => {
    let out = rows;
    if (q.trim()) {
      const needle = q.toLowerCase();
      out = out.filter((r) => searchKeys(r).toLowerCase().includes(needle));
    }
    const c = chips?.find((x) => x.id === chip);
    if (c) out = out.filter(c.test);
    if (sort) {
      const col = columns.find((x) => x.key === sort.key);
      if (col?.sortValue) {
        out = [...out].sort((a, b) => {
          const va = col.sortValue!(a);
          const vb = col.sortValue!(b);
          return va === vb ? 0 : (va > vb ? 1 : -1) * sort.dir;
        });
      }
    }
    return out;
  }, [rows, q, chip, sort, chips, columns, searchKeys]);

  if (loading) return <TableSkeleton />;

  const allSelected = filtered.length > 0 && selected.length === filtered.length;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-48 flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-muted-foreground" aria-hidden />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search…"
            className="h-9 pl-8"
            aria-label="Search records"
          />
          {q && (
            <button
              onClick={() => setQ("")}
              className="absolute right-2 top-2.5 text-muted-foreground hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
        {toolbar}
      </div>

      {chips?.length ? (
        <div className="flex flex-wrap gap-1.5">
          {chips.map((c) => (
            <button
              key={c.id}
              onClick={() => setChip(chip === c.id ? null : c.id)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs transition-colors",
                chip === c.id
                  ? "border-primary bg-primary/15 text-primary"
                  : "border-border text-muted-foreground hover:border-border-strong hover:text-foreground",
              )}
            >
              {c.label}
              <span className="numeric ml-1.5 opacity-70">{rows.filter(c.test).length}</span>
            </button>
          ))}
        </div>
      ) : null}

      {bulkActions && selected.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-md border border-primary/40 bg-primary/10 px-3 py-2 text-sm">
          <span className="numeric">{selected.length} selected</span>
          {bulkActions.map((a) => (
            <Button
              key={a.label}
              size="sm"
              variant="outline"
              onClick={() => {
                a.run(selected);
                setSelected([]);
              }}
            >
              {a.label}
            </Button>
          ))}
          <Button size="sm" variant="ghost" onClick={() => setSelected([])}>
            Clear
          </Button>
        </div>
      )}

      {filtered.length === 0 ? (
        <EmptyState
          title={emptyTitle}
          message={q || chip ? "No records match the current search or filter. Clear them to see everything." : emptyMessage}
          actionLabel={emptyAction?.label}
          onAction={emptyAction?.onAction}
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <Table>
            <TableHeader className="sticky top-0 bg-surface">
              <TableRow className="hover:bg-transparent">
                {bulkActions && (
                  <TableHead className="w-10">
                    <Checkbox
                      checked={allSelected}
                      onCheckedChange={(v) => setSelected(v ? filtered.map((r) => r.id) : [])}
                      aria-label="Select all"
                    />
                  </TableHead>
                )}
                {columns.map((c) => (
                  <TableHead
                    key={c.key}
                    className={cn(c.className, c.hideOnMobile && "hidden md:table-cell")}
                  >
                    {c.sortValue ? (
                      <button
                        className="inline-flex items-center gap-1 hover:text-foreground"
                        onClick={() =>
                          setSort((s) =>
                            s?.key === c.key ? { key: c.key, dir: s.dir === 1 ? -1 : 1 } : { key: c.key, dir: 1 },
                          )
                        }
                      >
                        {c.header}
                        <span className="text-[10px]">{sort?.key === c.key ? (sort.dir === 1 ? "▲" : "▼") : "↕"}</span>
                      </button>
                    ) : (
                      c.header
                    )}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((row) => (
                <TableRow
                  key={row.id}
                  onClick={() => onRowClick?.(row)}
                  className={cn(onRowClick && "cursor-pointer")}
                >
                  {bulkActions && (
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selected.includes(row.id)}
                        onCheckedChange={(v) =>
                          setSelected((s) => (v ? [...s, row.id] : s.filter((x) => x !== row.id)))
                        }
                        aria-label={`Select ${row.id}`}
                      />
                    </TableCell>
                  )}
                  {columns.map((c) => (
                    <TableCell key={c.key} className={cn(c.className, c.hideOnMobile && "hidden md:table-cell")}>
                      {c.cell(row)}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        Showing <span className="numeric">{filtered.length}</span> of <span className="numeric">{rows.length}</span> records
      </p>
    </div>
  );
}
