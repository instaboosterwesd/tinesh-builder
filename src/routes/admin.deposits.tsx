import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Wallet, Check, X, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAdminPass } from "@/lib/admin-session";
import { adminDecideDeposit, adminListDeposits } from "@/lib/wallet.functions";
import { StatusBadge } from "@/components/StatusBadge";

export const Route = createFileRoute("/admin/deposits")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Deposits — Admin" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminDeposits,
});

type Deposit = Awaited<ReturnType<typeof adminListDeposits>>[number];

function AdminDeposits() {
  const pass = useAdminPass();
  const [rows, setRows] = useState<Deposit[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!pass) return;
    try {
      setRows(await adminListDeposits({ data: { password: pass } }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load");
    }
  }, [pass]);

  useEffect(() => { load(); }, [load]);

  async function decide(id: string, decision: "approve" | "reject") {
    if (!pass) return;
    setBusy(id);
    try {
      const res = await adminDecideDeposit({ data: { password: pass, id, decision } });
      toast.success(decision === "approve" ? `Approved — new balance ₹${res.balance ?? "?"}` : "Rejected");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(null);
    }
  }

  if (!pass) return null;

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold"><Wallet className="size-6 text-primary" /> Deposits</h1>
          <p className="mt-1 text-sm text-muted-foreground">Review UPI payments and credit user wallets.</p>
        </div>
        <Button variant="outline" size="sm" onClick={load}><RefreshCw className="size-4" /> Refresh</Button>
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        {rows.length ? (
          <ul className="divide-y divide-border">
            {rows.map((d) => (
              <li key={d.id} className="flex flex-wrap items-center gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">₹{d.amount} <span className="ml-2 font-mono text-xs text-muted-foreground">UTR {d.utr}</span></p>
                  <p className="truncate text-xs text-muted-foreground">{d.user_email} · {new Date(d.created_at).toLocaleString()}</p>
                </div>
                <StatusBadge status={d.status} />
                {d.status === "pending" && (
                  <div className="flex gap-2">
                    <Button size="sm" variant="hero" disabled={busy === d.id} onClick={() => decide(d.id, "approve")}>
                      <Check className="size-4" /> Approve
                    </Button>
                    <Button size="sm" variant="outline" disabled={busy === d.id} onClick={() => decide(d.id, "reject")}>
                      <X className="size-4" /> Reject
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="p-8 text-center text-sm text-muted-foreground">No deposit requests yet.</p>
        )}
      </div>
    </div>
  );
}
