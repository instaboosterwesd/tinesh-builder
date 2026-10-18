import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { LottieIcon, preloadLottie } from "@/components/effects/LottieIcon";
import { STICKERS } from "@/lib/stickers";
import { AppShell, PageHeader, RequireAuth } from "@/components/AppShell";
import { myBuilds, userRebuild } from "@/lib/builder.functions";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { QueryFeedback } from "@/components/QueryFeedback";
import { withRequestTimeout } from "@/lib/request-timeout";
import { useAuth } from "@/hooks/useAuth";
import { SmartImage } from "@/components/SmartImage";
import { tgDownloadLink, tgDownloadText } from "@/lib/telegram";
import { getMyProfile } from "@/lib/users.functions";

export const Route = createFileRoute("/orders")({
  head: () => ({
    meta: [
      { title: "My Orders — AppForge" },
      { name: "description", content: "Track your app builds and download finished APKs." },
      { property: "og:title", content: "My Orders — AppForge" },
      { property: "og:description", content: "Track your app builds and download finished APKs." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <AppShell>
      <main className="mx-auto max-w-3xl px-4 py-6">
        <PageHeader title="My Orders" subtitle="Every app you have built." />
        <RequireAuth>
          <Orders />
        </RequireAuth>
      </main>
    </AppShell>
  ),
});

function Orders() {
  const { user } = useAuth();
  useEffect(() => { preloadLottie([STICKERS.orders, STICKERS.download]); }, []);
  const fetchBuilds = useServerFn(myBuilds);
  const { data, isError, refetch } = useQuery({ queryKey: ["my-builds", user?.uid], queryFn: () => withRequestTimeout(() => fetchBuilds()), refetchInterval: 15000, retry: false });
  const rebuildFn = useServerFn(userRebuild);
  const siteSettings = useSiteSettings().data;
  const canRebuild = siteSettings?.user_rebuild === true;
  const tgUser = siteSettings?.tg_download_username?.trim() ?? "";
  const tgDownload = siteSettings?.tg_download_enabled === true && tgUser !== "";
  const fetchProfile = useServerFn(getMyProfile);
  const me = useQuery({ queryKey: ["my-profile", user?.uid], queryFn: () => withRequestTimeout(() => fetchProfile()), retry: false, staleTime: 30_000, enabled: tgDownload }).data?.profile;
  const [busy, setBusy] = useState<string | null>(null);
  const rebuild = async (id: string) => {
    setBusy(id);
    try { await rebuildFn({ data: { id } }); toast.success("Rebuild started"); await refetch(); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Rebuild failed"); }
    finally { setBusy(null); }
  };
  if (!data) return <QueryFeedback label="your orders" failed={isError} retry={() => refetch()} />;
  if (!data.length)
    return (
      <div className="surface clay p-10 text-center">
        <LottieIcon src={STICKERS.orders} className="mx-auto size-10" />
        <p className="mt-3 font-semibold">No orders yet</p>
        <Button asChild variant="hero" className="mt-4"><Link to="/">Browse templates</Link></Button>
      </div>
    );
  return (
    <div className="space-y-3">
      {data.map((b) => (
        <div key={b.id} className="surface clay flex items-center gap-3 p-4">
          {b.logo ? (
            <SmartImage src={b.logo} alt="" className="size-12 shrink-0 rounded-2xl" />
          ) : (
            <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-gradient-primary text-primary-foreground"><LottieIcon src={STICKERS.orders} className="size-6" /></span>
          )}
          <div className="min-w-0 flex-1">
            <div className="truncate font-semibold">{b.app_name}</div>
            <div className="truncate text-xs text-muted-foreground">{b.package_name}</div>
            <div className="truncate text-xs text-muted-foreground">
              {b.template_name} · ₹{b.charged} · {new Date(b.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <StatusBadge status={b.status} />
            {b.status === "success" && tgDownload ? (
              <Button asChild size="sm" variant="hero">
                <a
                  href={tgDownloadLink(tgUser, tgDownloadText(siteSettings?.tg_download_message ?? "", {
                    orderId: b.id,
                    appName: b.app_name,
                    name: me?.name ?? user?.displayName ?? "",
                    username: me?.telegram_id ? `@${me.telegram_id}` : "",
                  }) + (user?.email ? encodeURIComponent(`\nEmail: ${user.email}`) : ""))}
                  target="_blank"
                  rel="noopener noreferrer"
                ><LottieIcon src={STICKERS.download} className="size-5" /> Get APK</a>
              </Button>
            ) : b.download && (
              <Button asChild size="sm" variant="hero"><a href={b.download}><LottieIcon src={STICKERS.download} className="size-5" /> APK</a></Button>
            )}
            {canRebuild && (b.status === "success" || b.status === "failed") && (
              <Button size="sm" variant="outline" disabled={busy === b.id} onClick={() => rebuild(b.id)}><RefreshCw className={busy === b.id ? "size-4 animate-spin" : "size-4"} /> Rebuild</Button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
