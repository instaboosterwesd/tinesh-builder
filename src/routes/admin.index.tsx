import { createFileRoute, Link } from "@tanstack/react-router";
import { Clock, Hammer, CheckCircle2, LayoutTemplate, ArrowRight } from "lucide-react";
import { useOverview } from "@/lib/admin-queries";
import { StatusBadge } from "@/components/StatusBadge";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/admin/")({ component: Dashboard });

function Dashboard() {
  const { data, isLoading } = useOverview();
  const reqs = data?.requests ?? [];
  const count = (s: string[]) => reqs.filter((r) => s.includes(r.status)).length;
  const stats = [
    { label: "Pending", value: count(["pending"]), Icon: Clock, cls: "text-warning bg-warning/15" },
    { label: "Building", value: count(["approved", "building"]), Icon: Hammer, cls: "text-primary bg-primary/15" },
    { label: "APKs ready", value: count(["success"]), Icon: CheckCircle2, cls: "text-success bg-success/15" },
    { label: "Templates", value: data?.templateCount ?? 0, Icon: LayoutTemplate, cls: "text-info bg-info/15" },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold sm:text-3xl">Dashboard</h1>
      <p className="mt-1 text-muted-foreground">Overview of your builder.</p>
      <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <div className={`grid size-10 place-items-center rounded-lg ${s.cls}`}><s.Icon className="size-5" /></div>
            <p className="mt-4 text-sm text-muted-foreground">{s.label}</p>
            {isLoading ? <Skeleton className="mt-1 h-8 w-12" /> : <p className="text-3xl font-bold">{s.value}</p>}
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border p-5">
          <h2 className="font-semibold">Recent requests</h2>
          <Link to="/admin/requests" className="flex items-center gap-1 text-sm text-primary">View all <ArrowRight className="size-4" /></Link>
        </div>
        {reqs.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted-foreground">{isLoading ? "Loading…" : "No requests yet."}</p>
        ) : (
          <ul className="divide-y divide-border">
            {reqs.slice(0, 5).map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <p className="truncate font-medium">{r.app_name}</p>
                  <p className="truncate text-sm text-muted-foreground">{r.requester_name} · {r.template_name}</p>
                </div>
                <span className="shrink-0"><StatusBadge status={r.status} /></span>
              </li>
            ))}
          </ul>
        )}
      </div>

    </div>
  );
}
