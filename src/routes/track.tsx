import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Download, Search } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getRequestStatus } from "@/lib/builder.functions";

export const Route = createFileRoute("/track")({
  validateSearch: (s: Record<string, unknown>): { id?: string } => (typeof s["id"] === "string" ? { id: s["id"] } : {}),
  head: () => ({
    meta: [
      { title: "Track your build — Builder" },
      { name: "description", content: "Check the status of your APK build request." },
      { property: "og:title", content: "Track your build — Builder" },
      { property: "og:description", content: "Check the status of your APK build request." },
    ],
  }),
  component: TrackPage,
});

function TrackPage() {
  const { id } = Route.useSearch();
  const navigate = useNavigate({ from: "/track" });
  const q = useQuery({
    queryKey: ["status", id],
    queryFn: () => getRequestStatus({ data: { id: id! } }),
    enabled: !!id,
    refetchInterval: 10000,
  });

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-xl px-4 py-10 sm:py-16">
        <h1 className="text-3xl font-bold sm:text-4xl">Track your build</h1>
        <p className="mt-2 text-muted-foreground">Enter the request ID you received.</p>
        <form
          className="mt-6 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const v = String(new FormData(e.currentTarget).get("id") ?? "").trim();
            navigate({ search: v ? { id: v } : {} });
          }}
        >
          <Input name="id" defaultValue={id} placeholder="e.g. 3f2a…" className="font-mono" />
          <Button type="submit"><Search /> Check</Button>
        </form>

        {id && (
          <div className="mt-6 rounded-2xl border border-border bg-card p-5 shadow-sm">
            {q.isLoading ? (
              <p className="text-muted-foreground">Loading…</p>
            ) : !q.data ? (
              <p className="text-muted-foreground">No request found with that ID.</p>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold">{q.data.app_name}</h2>
                  <StatusBadge status={q.data.status} />
                </div>
                <p className="text-sm text-muted-foreground">Template: {q.data.template_name}</p>
                <p className="text-sm text-muted-foreground">Last update: {new Date(q.data.updated_at).toLocaleString()}</p>
                {q.data.download && (
                  <Button variant="success" asChild className="w-full"><a href={q.data.download}><Download /> Download APK</a></Button>
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
