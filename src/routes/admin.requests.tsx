import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Check, X, Inbox, Download, History, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useOverview } from "@/lib/admin-queries";
import { adminDecide, adminDeleteRequest } from "@/lib/builder.functions";
import { getAdminPass } from "@/lib/admin-session";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/admin/requests")({ component: Requests });

function Requests() {
  const { data, isLoading } = useOverview();
  const qc = useQueryClient();
  const [filter, setFilter] = useState("all");
  const [busy, setBusy] = useState<string | null>(null);
  const latest = Object.values(
    (data?.requests ?? [])
      .filter((r) => r.status === "success" && r.download)
      .reduce<Record<string, NonNullable<typeof data>["requests"][number]>>((acc, r) => {
        const k = r.requester_email.toLowerCase();
        if (!acc[k] || acc[k].updated_at < r.updated_at) acc[k] = r;
        return acc;
      }, {}),
  );
  const reqs = (data?.requests ?? []).filter((r) => filter === "all" || r.status === filter);

  async function remove(id: string, name: string) {
    if (!confirm(`Delete build "${name}" from history? Its APK will be removed too.`)) return;
    setBusy(id);
    try {
      await adminDeleteRequest({ data: { password: getAdminPass(), id } });
      toast.success("Deleted");
      qc.invalidateQueries({ queryKey: ["admin"] });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function decide(id: string, decision: "approve" | "reject") {
    setBusy(id);
    try {
      const res = await adminDecide({ data: { password: getAdminPass(), id, decision } });
      if (decision === "reject") toast("Request rejected");
      else if (res.github) toast.success("Approved — APK build started on GitHub");
      else toast.warning("Approved", { description: res.log });
      qc.invalidateQueries({ queryKey: ["admin"] });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold sm:text-3xl">Build history</h1>
      <p className="mt-1 text-muted-foreground">Approve a request to start its APK build.</p>
      <Tabs value={filter} onValueChange={setFilter} className="-mx-4 mt-5 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <TabsList className="w-max">
          {["all", "pending", "building", "success", "failed", "rejected"].map((s) => (
            <TabsTrigger key={s} value={s} className="capitalize">{s}</TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {latest.length > 0 && (
        <section className="mt-6">
          <h2 className="flex items-center gap-2 text-lg font-semibold"><History className="size-5" /> Last build per user</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {latest.map((r) => (
              <div key={r.id} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3 shadow-sm">
                {r.logo ? <img src={r.logo} alt="" className="size-11 shrink-0 rounded-xl object-cover" /> : <div className="size-11 shrink-0 rounded-xl bg-muted" />}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{r.requester_name} · {r.app_name}</p>
                  <p className="truncate text-xs text-muted-foreground">{r.requester_email} · {new Date(r.updated_at).toLocaleString()}</p>
                </div>
                <Button size="sm" variant="success" asChild><a href={r.download!}><Download /></a></Button>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="mt-6 space-y-3">
        {reqs.length === 0 && (
          <div className="grid place-items-center rounded-2xl border border-dashed border-border p-14 text-center">
            <Inbox className="size-8 text-muted-foreground" />
            <p className="mt-2 text-sm text-muted-foreground">{isLoading ? "Loading…" : "Nothing here."}</p>
          </div>
        )}
        {reqs.map((r) => (
          <div key={r.id} className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  {r.logo && <img src={r.logo} alt="" className="size-8 rounded-lg object-cover" />}
                  <h3 className="text-lg font-semibold">{r.app_name}</h3>
                  <StatusBadge status={r.status} />
                </div>
                {r.register_link && <p className="mt-1 break-all text-xs text-primary">{r.register_link}</p>}
                <p className="mt-1 break-all font-mono text-xs text-muted-foreground">{r.package_name}</p>
                <p className="mt-2 text-sm">{r.requester_name} · <span className="break-all text-muted-foreground">{r.requester_email}</span></p>
                <p className="text-sm text-muted-foreground">Template: {r.template_name} · {new Date(r.created_at).toLocaleString()}</p>
                {r.notes && <p className="mt-2 rounded-lg bg-muted p-3 text-sm">{r.notes}</p>}
                {r.build_log && <p className="mt-2 text-xs text-muted-foreground">Log: {r.build_log}</p>}
              </div>
              <div className="flex shrink-0 gap-2 [&>*]:flex-1 sm:[&>*]:flex-none">
                {r.status === "pending" && (
                  <>
                    <Button variant="outline" size="sm" disabled={busy === r.id} onClick={() => decide(r.id, "reject")}><X /> Reject</Button>
                    <Button variant="hero" size="sm" disabled={busy === r.id} onClick={() => decide(r.id, "approve")}><Check /> Approve & build</Button>
                  </>
                )}
                {r.download && (
                  <Button variant="success" size="sm" asChild><a href={r.download}><Download /> Download APK</a></Button>
                )}
                <Button variant="outline" size="sm" aria-label="Delete" disabled={busy === r.id} onClick={() => remove(r.id, r.app_name)}><Trash2 /> Delete</Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
