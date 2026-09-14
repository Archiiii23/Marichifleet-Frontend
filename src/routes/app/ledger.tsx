import { createFileRoute, Link } from "@tanstack/react-router";
import { BookOpen, Edit2, Lock, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Amount } from "@/components/mf/amount";
import { EmptyState, KpiCard, NoAccess, PageHeader, Panel } from "@/components/mf/primitives";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { fmtDate, useDb } from "@/domain/hooks";
import { deriveLedger, type LedgerEntry } from "@/domain/os/ops";
import { useSession } from "@/domain/session";
import { audit } from "@/domain/store";

export const Route = createFileRoute("/app/ledger")({
  head: () => ({
    meta: [
      { title: "Ledger — MarichiFleet" },
      { name: "description", content: "Append-only double-entry ledger: every posting traces back to the document that caused it." },
      { property: "og:title", content: "Ledger — MarichiFleet" },
      { property: "og:description", content: "Balances, trial balance and postings for the transport business." },
      { property: "og:type", content: "website" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Ledger,
});

const ACCOUNTS = [
  "Accounts receivable",
  "Freight income",
  "Bank",
  "Fuel expense",
  "Tolls & transit",
  "Vendor payables",
  "Driver wages",
  "Workshop & maintenance",
  "GST input credit",
  "GST output payable",
] as const;

export function Ledger() {
  const db = useDb();
  const { persona, can } = useSession();
  const [q, setQ] = useState("");
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null);

  // Derived base entries
  const baseEntries = useMemo(() => deriveLedger(db), [db]);

  // Manual / Edited journal postings overlay
  const [manualEntries, setManualEntries] = useState<LedgerEntry[]>([]);
  const [editedEntries, setEditedEntries] = useState<Record<string, Partial<LedgerEntry>>>({});

  // Add Journal Entry Dialog State
  const [addOpen, setAddOpen] = useState(false);
  const [newNarration, setNewNarration] = useState("");
  const [newAccount, setNewAccount] = useState<string>(ACCOUNTS[0]);
  const [newType, setNewType] = useState<"debit" | "credit">("debit");
  const [newAmount, setNewAmount] = useState("");
  const [newRef, setNewRef] = useState("");

  // Edit Existing Entry Dialog State
  const [editingEntry, setEditingEntry] = useState<LedgerEntry | null>(null);
  const [editNarration, setEditNarration] = useState("");
  const [editAccount, setEditAccount] = useState("");
  const [editDebit, setEditDebit] = useState("");
  const [editCredit, setEditCredit] = useState("");

  // Check if current user has Director / Admin authority to mutate ledger
  const canEditLedger =
    (persona.role as string) === "director" ||
    persona.role === "owner" ||
    persona.role === "admin" ||
    persona.id === "u_owner" ||
    can("view_admin");

  if (!can("ledger:read") && !can("view_finance")) {
    return <NoAccess what="the general ledger" />;
  }

  // Combine base and manual entries with overrides
  const entries = useMemo(() => {
    const combined = [...manualEntries, ...baseEntries];
    return combined.map((e) => {
      const override = editedEntries[e.id];
      return override ? { ...e, ...override } : e;
    });
  }, [baseEntries, manualEntries, editedEntries]);

  const filtered = entries.filter((e) => {
    if (selectedAccount && e.account !== selectedAccount) return false;
    if (!q) return true;
    return `${e.narration} ${e.account} ${e.source}`.toLowerCase().includes(q.toLowerCase());
  });

  const balances = new Map<string, number>();
  for (const e of entries) {
    balances.set(e.account, (balances.get(e.account) ?? 0) + (e.debitMinor - e.creditMinor));
  }

  const debitsMinor = entries.reduce((s, e) => s + e.debitMinor, 0);
  const creditsMinor = entries.reduce((s, e) => s + e.creditMinor, 0);
  const diffMinor = debitsMinor - creditsMinor;

  const handleCreateEntry = (e: React.FormEvent) => {
    e.preventDefault();
    const amountVal = parseFloat(newAmount);
    if (!amountVal || amountVal <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    const minor = Math.round(amountVal * 100);
    const entryId = `le_man_${Date.now()}`;
    const newEntry: LedgerEntry = {
      id: entryId,
      atISO: new Date().toISOString(),
      narration: newNarration.trim() || "Manual Journal Adjustment",
      account: newAccount,
      debitMinor: newType === "debit" ? minor : 0,
      creditMinor: newType === "credit" ? minor : 0,
      source: newRef.trim() || `JV-${Math.floor(1000 + Math.random() * 9000)}`,
    };

    setManualEntries((prev) => [newEntry, ...prev]);
    audit(persona.name, `Added manual ledger posting: ${newEntry.narration} (${newAccount})`, "ledger", entryId);
    toast.success("Journal Entry Recorded", {
      description: `Posted by ${persona.name} (${persona.title})`,
    });

    setAddOpen(false);
    setNewNarration("");
    setNewAmount("");
    setNewRef("");
  };

  const openEditModal = (entry: LedgerEntry) => {
    setEditingEntry(entry);
    setEditNarration(entry.narration);
    setEditAccount(entry.account);
    setEditDebit(entry.debitMinor ? (entry.debitMinor / 100).toString() : "0");
    setEditCredit(entry.creditMinor ? (entry.creditMinor / 100).toString() : "0");
  };

  const handleSaveEdit = () => {
    if (!editingEntry) return;
    const debitVal = parseFloat(editDebit) || 0;
    const creditVal = parseFloat(editCredit) || 0;

    setEditedEntries((prev) => ({
      ...prev,
      [editingEntry.id]: {
        narration: editNarration.trim(),
        account: editAccount,
        debitMinor: Math.round(debitVal * 100),
        creditMinor: Math.round(creditVal * 100),
      },
    }));

    audit(
      persona.name,
      `Admin adjusted ledger posting ${editingEntry.source} (${editAccount})`,
      "ledger",
      editingEntry.id
    );

    toast.success("Ledger Entry Updated", {
      description: `Authorized adjustment saved by ${persona.name}`,
    });
    setEditingEntry(null);
  };

  return (
    <>
      <PageHeader
        title="General Ledger"
        subtitle="Double-entry journal register. Authorized Fleet Owners / Admins may record adjustments or correct postings."
        actions={
          <div className="flex items-center gap-2">
            {canEditLedger ? (
              <Button size="sm" onClick={() => setAddOpen(true)} className="gap-1.5 font-medium shadow-xs">
                <Plus className="size-4" /> Add Journal Entry
              </Button>
            ) : (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Lock className="size-3.5" /> Read-only mode
              </span>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                const csv = [
                  "Date,Narration,Account,Reference,Debit,Credit",
                  ...filtered.map((e) =>
                    `"${fmtDate(e.atISO)}","${e.narration.replace(/"/g, '""')}","${e.account}","${e.source}",${(e.debitMinor / 100).toFixed(2)},${(e.creditMinor / 100).toFixed(2)}`
                  ),
                ].join("\n");
                const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `ledger-trial-balance-${new Date().toISOString().slice(0, 10)}.csv`;
                a.click();
                URL.revokeObjectURL(url);
                toast.success("Trial Balance Exported (CSV)");
              }}
            >
              Export Trial Balance
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-border bg-card p-4">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Debits</span>
          <div className="mt-2 text-2xl font-bold tracking-tight">
            <Amount value={{ minor: debitsMinor, currency: "INR" }} />
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">{entries.length} validated postings</p>
        </div>

        <div className="rounded-lg border border-border bg-card p-4">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Credits</span>
          <div className="mt-2 text-2xl font-bold tracking-tight">
            <Amount value={{ minor: creditsMinor, currency: "INR" }} />
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">Balanced trial entries</p>
        </div>

        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Net Difference</span>
            <span className={`size-2 rounded-full ${diffMinor === 0 ? "bg-emerald-500" : "bg-warning"}`} aria-hidden />
          </div>
          <div className={`mt-2 text-2xl font-bold tracking-tight ${diffMinor === 0 ? "text-emerald-500" : "text-warning"}`}>
            <Amount value={{ minor: diffMinor, currency: "INR" }} />
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {diffMinor === 0 ? "Perfect balance (Trial Balance = 0)" : "Pending reconciliation batch"}
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,300px)_1fr]">
        <Panel
          title="Account Balances"
          description="Click to filter ledger"
          actions={
            selectedAccount ? (
              <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={() => setSelectedAccount(null)}>
                Clear filter
              </Button>
            ) : null
          }
        >
          <ul className="space-y-1 text-xs">
            {Array.from(balances.entries()).map(([account, netMinor]) => (
              <li key={account}>
                <button
                  type="button"
                  onClick={() => setSelectedAccount(selectedAccount === account ? null : account)}
                  className={`flex w-full items-center justify-between rounded px-2 py-1.5 text-left transition-colors ${
                    selectedAccount === account ? "bg-primary text-primary-foreground font-semibold" : "hover:bg-surface"
                  }`}
                >
                  <span className="truncate">{account}</span>
                  <span className="font-mono numeric font-medium">
                    <Amount value={{ minor: netMinor, currency: "INR" }} />
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel
          title="Journal Postings"
          description={selectedAccount ? `Filtered by ${selectedAccount} (${filtered.length} entries)` : `${filtered.length} entries`}
          actions={
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search narration, account or ref…"
              className="h-8 w-64 text-xs"
            />
          }
        >
          {filtered.length === 0 ? (
            <EmptyState title="No matching postings" message="Nothing matches this search in the selected account or period." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                    <th className="py-2.5 pr-3 font-semibold">Date</th>
                    <th className="py-2.5 pr-3 font-semibold">Narration & Document</th>
                    <th className="py-2.5 pr-3 font-semibold">Account</th>
                    <th className="py-2.5 pr-3 text-right font-semibold">Debit</th>
                    <th className="py-2.5 text-right font-semibold">Credit</th>
                    {canEditLedger && <th className="py-2.5 text-right font-semibold w-16">Admin</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filtered.slice(0, 120).map((e) => (
                    <tr key={e.id} className="hover:bg-surface/40 transition-colors group">
                      <td className="numeric py-2.5 pr-3 text-xs text-muted-foreground">{fmtDate(e.atISO)}</td>
                      <td className="py-2.5 pr-3">
                        {e.sourceLink ? (
                          <Link to={e.sourceLink as "/"} className="font-medium text-foreground hover:text-primary transition-colors">
                            {e.narration}
                          </Link>
                        ) : (
                          <span className="font-medium">{e.narration}</span>
                        )}
                        <span className="block text-[11px] font-mono text-muted-foreground">{e.source}</span>
                      </td>
                      <td className="py-2.5 pr-3">
                        <span className="rounded bg-surface px-1.5 py-0.5 text-xs font-mono text-muted-foreground">
                          {e.account}
                        </span>
                      </td>
                      <td className="numeric py-2.5 pr-3 text-right">
                        {e.debitMinor ? <Amount value={{ minor: e.debitMinor, currency: "INR" }} className="font-mono font-medium" /> : "—"}
                      </td>
                      <td className="numeric py-2.5 text-right">
                        {e.creditMinor ? <Amount value={{ minor: e.creditMinor, currency: "INR" }} className="font-mono text-muted-foreground" /> : "—"}
                      </td>
                      {canEditLedger && (
                        <td className="py-2.5 text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-xs text-muted-foreground hover:text-primary"
                            onClick={() => openEditModal(e)}
                          >
                            <Edit2 className="size-3 mr-1" /> Edit
                          </Button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </div>

      {/* Add Journal Entry Modal (Admin Only) */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="size-5 text-primary" />
              Add Manual Journal Entry
            </DialogTitle>
            <DialogDescription>
              Record an adjustment, cash expense, bank reconciliation, or ledger correction.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateEntry} className="space-y-3 py-2 text-xs">
            <div>
              <Label htmlFor="jNarr" className="text-xs">Narration / Description</Label>
              <Input
                id="jNarr"
                value={newNarration}
                onChange={(e) => setNewNarration(e.target.value)}
                placeholder="e.g. Bank charges adjustment, diesel price differential"
                className="mt-1"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="jAcc" className="text-xs">Ledger Account</Label>
                <Select value={newAccount} onValueChange={setNewAccount}>
                  <SelectTrigger id="jAcc" className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ACCOUNTS.map((acc) => (
                      <SelectItem key={acc} value={acc}>{acc}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="jType" className="text-xs">Type</Label>
                <Select value={newType} onValueChange={(v) => setNewType(v as any)}>
                  <SelectTrigger id="jType" className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="debit">Debit (+)</SelectItem>
                    <SelectItem value="credit">Credit (-)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="jAmt" className="text-xs">Amount (₹)</Label>
                <Input
                  id="jAmt"
                  type="number"
                  step="0.01"
                  value={newAmount}
                  onChange={(e) => setNewAmount(e.target.value)}
                  placeholder="e.g. 15000"
                  className="mt-1 font-mono"
                  required
                />
              </div>
              <div>
                <Label htmlFor="jRef" className="text-xs">Voucher Ref / Doc #</Label>
                <Input
                  id="jRef"
                  value={newRef}
                  onChange={(e) => setNewRef(e.target.value)}
                  placeholder="e.g. JV-9921"
                  className="mt-1 font-mono"
                />
              </div>
            </div>

            <div className="rounded bg-muted/40 p-2.5 text-[11px] text-muted-foreground flex items-center gap-1.5">
              <ShieldCheck className="size-4 text-emerald-600 shrink-0" />
              <span>Signed and audited under admin identity: <strong>{persona.name}</strong></span>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="ghost" onClick={() => setAddOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Post to Ledger</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Entry Modal (Admin Only) */}
      {editingEntry && (
        <Dialog open={!!editingEntry} onOpenChange={(open) => !open && setEditingEntry(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Edit2 className="size-5 text-primary" />
                Edit Ledger Posting
              </DialogTitle>
              <DialogDescription>
                Correct narration, reclassify account, or adjust posted debit/credit.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2 text-xs">
              <div>
                <Label className="text-xs">Narration</Label>
                <Input
                  value={editNarration}
                  onChange={(e) => setEditNarration(e.target.value)}
                  className="mt-1"
                />
              </div>

              <div>
                <Label className="text-xs">Ledger Account</Label>
                <Select value={editAccount} onValueChange={setEditAccount}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ACCOUNTS.map((acc) => (
                      <SelectItem key={acc} value={acc}>{acc}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Debit Amount (₹)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={editDebit}
                    onChange={(e) => setEditDebit(e.target.value)}
                    className="mt-1 font-mono"
                  />
                </div>
                <div>
                  <Label className="text-xs">Credit Amount (₹)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={editCredit}
                    onChange={(e) => setEditCredit(e.target.value)}
                    className="mt-1 font-mono"
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button variant="ghost" onClick={() => setEditingEntry(null)}>
                Cancel
              </Button>
              <Button onClick={handleSaveEdit}>
                Save Adjustment
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
