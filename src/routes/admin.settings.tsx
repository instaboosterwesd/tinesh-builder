import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Settings2, IndianRupee, Landmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAdminPass } from "@/lib/admin-session";
import { adminGetSettings, adminSaveSettings } from "@/lib/wallet.functions";

export const Route = createFileRoute("/admin/settings")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Settings — Admin" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminSettings,
});

function AdminSettings() {
  const pass = useAdminPass();
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ upi_id: "", min_deposit: 100, build_price: 0 });

  useEffect(() => {
    if (!pass) return;
    adminGetSettings({ data: { password: pass } })
      .then((s) => { setForm(s); setLoaded(true); })
      .catch((e) => toast.error(e instanceof Error ? e.message : "Failed to load"));
  }, [pass]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!pass) return;
    setSaving(true);
    try {
      await adminSaveSettings({ data: { password: pass, ...form } });
      toast.success("Settings saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  if (!pass || !loaded) return null;

  return (
    <div className="max-w-xl">
      <h1 className="flex items-center gap-2 text-2xl font-bold"><Settings2 className="size-6 text-primary" /> Settings</h1>
      <p className="mt-1 text-sm text-muted-foreground">Payment and pricing configuration for the wallet system.</p>

      <form onSubmit={save} className="mt-6 grid gap-5">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <label className="flex items-center gap-2 text-sm font-semibold"><Landmark className="size-4 text-primary" /> UPI ID</label>
          <p className="mt-1 text-xs text-muted-foreground">Users will pay to this UPI ID when adding balance.</p>
          <Input
            value={form.upi_id}
            onChange={(e) => setForm({ ...form, upi_id: e.target.value })}
            placeholder="yourname@upi"
            required
            className="mt-3"
          />
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <label className="flex items-center gap-2 text-sm font-semibold"><IndianRupee className="size-4 text-primary" /> Minimum deposit</label>
          <p className="mt-1 text-xs text-muted-foreground">Smallest amount a user can add to their wallet.</p>
          <Input
            type="number"
            min={1}
            value={form.min_deposit}
            onChange={(e) => setForm({ ...form, min_deposit: Number(e.target.value) })}
            required
            className="mt-3"
          />
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <label className="flex items-center gap-2 text-sm font-semibold"><IndianRupee className="size-4 text-primary" /> Build price</label>
          <p className="mt-1 text-xs text-muted-foreground">Balance charged per build request. Set 0 to make builds free.</p>
          <Input
            type="number"
            min={0}
            value={form.build_price}
            onChange={(e) => setForm({ ...form, build_price: Number(e.target.value) })}
            required
            className="mt-3"
          />
        </div>

        <Button type="submit" variant="hero" disabled={saving}>{saving ? "Saving…" : "Save settings"}</Button>
      </form>
    </div>
  );
}
