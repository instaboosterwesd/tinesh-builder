import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Users, RefreshCw, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { adminListUsers } from "@/lib/users.functions";
import { useAdminPass } from "@/lib/admin-session";

export const Route = createFileRoute("/admin/users")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Users — Admin" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminUsers,
});

type Row = {
  uid: string;
  email: string;
  name: string;
  telegram_id: string;
  created_at: string;
  balance: number;
};

function AdminUsers() {
  const pass = useAdminPass();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!pass) return;
    setLoading(true);
    try {
      setRows(await adminListUsers({ data: { password: pass } }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load users");
    } finally {
      setLoading(false);
    }
  }, [pass]);

  useEffect(() => { void load(); }, [load]);

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="grid size-11 place-items-center rounded-xl bg-primary/15"><Users className="size-5 text-primary" /></div>
          <div>
            <h1 className="text-xl font-bold sm:text-2xl">Users</h1>
            <p className="text-sm text-muted-foreground">{rows.length} registered</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={loading ? "size-4 animate-spin" : "size-4"} /> Refresh
        </Button>
      </div>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-border bg-card">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Telegram</th>
              <th className="px-4 py-3">Balance</th>
              <th className="px-4 py-3">Joined</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((u) => (
              <tr key={u.uid} className="border-b border-border/60 last:border-0">
                <td className="px-4 py-3">
                  <div className="font-medium">{u.name || "—"}</div>
                  <div className="text-xs text-muted-foreground">{u.email}</div>
                </td>
                <td className="px-4 py-3">
                  {u.telegram_id ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                      <Send className="size-3" /> @{u.telegram_id}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </td>
                <td className="px-4 py-3 font-medium">₹{u.balance}</td>
                <td className="px-4 py-3 text-xs text-muted-foreground">
                  {new Date(u.created_at).toLocaleDateString()}
                </td>
              </tr>
            ))}
            {!loading && rows.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-10 text-center text-muted-foreground">No users yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
