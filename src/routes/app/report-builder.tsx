import { createFileRoute } from "@tanstack/react-router";
import { Download } from "lucide-react";
import { useMemo, useState } from "react";
import { EmptyState, PageHeader, Panel } from "@/components/mf/primitives";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { money, fmtDate, useDb } from "@/domain/hooks";
import { clientName } from "@/domain/store";

type Row = Record<string, string | number>;

export const Route = createFileRoute("/app/report-builder")({
  head: () => ({
    meta: [
      { title: "Report builder — MarichiFleet" },
      { name: "description", content: "Build your own report: pick a dataset, choose columns, filter and group, then export to CSV." },
      { property: "og:title", content: "Report builder — MarichiFleet" },
      { property: "og:description", content: "Custom reports across bookings, trips, invoices, vehicles and fuel." },
    ],
  }),
  component: ReportBuilder,
});

export default function noop() {}

function ReportBuilder() {
  const db = useDb();

  const datasets = useMemo(() => {
    const bookings: Row[] = db.bookings.map((b) => ({
      Reference: b.ref,
      Client: clientName(b.clientId),
      Status: b.status,
      Origin: b.pickup.city,
      Destination: b.drop.city,
      Distance: b.distanceKm,
      Rate: b.rate,
      Created: fmtDate(b.createdISO),
    }));
    const trips: Row[] = db.trips.map((t) => {
      const v = db.vehicles.find((x) => x.id === t.vehicleId);
      const d = db.drivers.find((x) => x.id === t.driverId);
      return {
        Reference: t.ref,
        Vehicle: v?.regNo ?? "—",
        Driver: d?.name ?? "—",
        Status: t.status,
        Progress: `${Math.round(t.progress * 100)}%`,
        Delay: t.delayMins,
        Revenue: t.revenue,
        Cost: t.fuelCost + t.tollCost + t.driverCost,
      };
    });
    const invoices: Row[] = db.invoices.map((i) => ({
      Reference: i.ref,
      Client: clientName(i.clientId),
      Status: i.status,
      Total: i.total,
      Paid: i.paid,
      Outstanding: i.total - i.paid,
      Due: fmtDate(i.dueISO),
    }));
    const vehicles: Row[] = db.vehicles.map((v) => ({
      Registration: v.regNo,
      Make: v.make,
      Type: v.type,
      Status: v.status,
      Odometer: v.odometerKm,
      Fuel: `${v.fuelPct}%`,
    }));
    const fuel: Row[] = db.fuelLogs.map((f) => {
      const v = db.vehicles.find((x) => x.id === f.vehicleId);
      return {
        Vehicle: v?.regNo ?? "—",
        Litres: f.litres,
        Cost: f.cost,
        Odometer: f.odometerKm,
        Station: f.station,
        Date: fmtDate(f.atISO),
      };
    });
    return { Bookings: bookings, Trips: trips, Invoices: invoices, Vehicles: vehicles, "Fuel logs": fuel } as Record<string, Row[]>;
  }, [db]);

  const names = Object.keys(datasets);
  const [dataset, setDataset] = useState(names[0]!);
  const rows = datasets[dataset] ?? [];
  const allColumns = rows.length ? Object.keys(rows[0]!) : [];
  const [hidden, setHidden] = useState<string[]>([]);
  const [filter, setFilter] = useState("");
  const [groupBy, setGroupBy] = useState("none");

  const columns = allColumns.filter((c) => !hidden.includes(c));
  const filtered = rows.filter((r) =>
    filter ? Object.values(r).join(" ").toLowerCase().includes(filter.toLowerCase()) : true,
  );

  const grouped = useMemo(() => {
    if (groupBy === "none") return null;
    const map = new Map<string, Row[]>();
    for (const r of filtered) {
      const key = String(r[groupBy] ?? "—");
      map.set(key, [...(map.get(key) ?? []), r]);
    }
    return [...map.entries()];
  }, [filtered, groupBy]);

  const exportCsv = () => {
    const header = columns.join(",");
    const body = filtered
      .map((r) => columns.map((c) => `"${String(r[c] ?? "").replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([`${header}\n${body}`], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `marichifleet-${dataset.toLowerCase().replace(/\s+/g, "-")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const numericTotal = (key: string, list: Row[]) =>
    list.reduce((s, r) => s + (typeof r[key] === "number" ? (r[key] as number) : 0), 0);

  return (
    <>
      <PageHeader
        title="Report builder"
        subtitle="Pick a dataset, choose the columns you care about, filter and group it, then export."
        actions={
          <Button size="sm" variant="outline" onClick={exportCsv} disabled={!filtered.length}>
            <Download className="size-3.5" aria-hidden /> Export CSV
          </Button>
        }
      />

      <Panel title="Report definition">
        <div className="grid gap-3 md:grid-cols-3">
          <label className="text-sm">
            <span className="mb-1 block text-xs text-muted-foreground">Dataset</span>
            <Select value={dataset} onValueChange={(v) => { setDataset(v); setHidden([]); setGroupBy("none"); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {names.map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}
              </SelectContent>
            </Select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-xs text-muted-foreground">Filter</span>
            <Input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Search any value" />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-xs text-muted-foreground">Group by</span>
            <Select value={groupBy} onValueChange={setGroupBy}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No grouping</SelectItem>
                {allColumns.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </label>
        </div>

        <p className="mt-4 text-xs uppercase tracking-wider text-muted-foreground">Columns</p>
        <div className="mt-2 flex flex-wrap gap-3">
          {allColumns.map((c) => (
            <label key={c} className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={!hidden.includes(c)}
                onCheckedChange={() => setHidden((h) => (h.includes(c) ? h.filter((x) => x !== c) : [...h, c]))}
              />
              {c}
            </label>
          ))}
        </div>
      </Panel>

      <Panel className="mt-4" title={`${dataset} — ${filtered.length} rows`}>
        {filtered.length === 0 ? (
          <EmptyState title="Nothing matches" message="Adjust the filter or pick a different dataset." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                  {columns.map((c) => <th key={c} className="py-2 pr-3">{c}</th>)}
                </tr>
              </thead>
              <tbody>
                {(grouped ?? [["", filtered] as [string, Row[]]]).map(([key, list]) => (
                  <>
                    {key && (
                      <tr key={`g-${key}`} className="bg-surface">
                        <td className="py-2 pr-3 text-xs font-semibold uppercase tracking-wider" colSpan={columns.length}>
                          {key} · {list.length} rows
                        </td>
                      </tr>
                    )}
                    {list.map((r, i) => (
                      <tr key={`${key}-${i}`} className="border-b border-border/60">
                        {columns.map((c) => (
                          <td key={c} className={typeof r[c] === "number" ? "numeric py-2 pr-3" : "py-2 pr-3"}>
                            {typeof r[c] === "number" && /rate|total|paid|cost|revenue|outstanding/i.test(c)
                              ? money(r[c] as number)
                              : String(r[c] ?? "—")}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-border">
                  {columns.map((c) => {
                    const isNum = typeof filtered[0]?.[c] === "number";
                    return (
                      <td key={c} className="numeric py-2 pr-3 text-xs text-muted-foreground">
                        {isNum ? numericTotal(c, filtered).toLocaleString() : ""}
                      </td>
                    );
                  })}
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </Panel>
    </>
  );
}
