import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Image as ImageIcon } from "lucide-react";
import { LottieIcon, preloadLottie } from "@/components/effects/LottieIcon";
import { STICKERS } from "@/lib/stickers";
import { AppShell } from "@/components/AppShell";
import { Input } from "@/components/ui/input";
import { baseApkLabel } from "@/lib/base-apks";
import { matchesProduct, productId } from "@/lib/product-id";
import { listTemplates } from "@/lib/builder.functions";
import { SmartImage } from "@/components/SmartImage";
import { SkeletonGrid } from "@/components/effects/HackerLoader";

export const templatesQuery = queryOptions({ queryKey: ["templates"], queryFn: () => listTemplates() });

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AppForge — Templates to Android APK" },
      { name: "description", content: "Browse app templates, preview them and build your own Android APK in minutes." },
      { property: "og:title", content: "AppForge — Templates to Android APK" },
      { property: "og:description", content: "Browse app templates, preview them and build your own Android APK in minutes." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(templatesQuery),
  pendingComponent: () => <AppShell><main className="mx-auto max-w-6xl px-4 py-6"><SkeletonGrid /></main></AppShell>,
  pendingMs: 200,
  component: Index,
});

function Index() {
  const { data: templates } = useSuspenseQuery(templatesQuery);
  const [q, setQ] = useState("");

  useEffect(() => { preloadLottie([STICKERS.search, STICKERS.leaders, STICKERS.video]); }, []);


  const list = useMemo(() => templates.filter((t) => matchesProduct(t, q)), [templates, q]);

  const searching = q.trim() !== "";

  return (
    <AppShell search={
          <div className="home-search relative w-full">
            <LottieIcon src={STICKERS.search} className="pointer-events-none absolute left-3 top-1/2 size-6 -translate-y-1/2" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search name or Product ID"
              aria-label="Search templates"
              className="home-search-input h-11 w-full rounded-2xl border-foreground/30 pl-11 text-foreground placeholder:text-foreground/75 focus-visible:ring-1"
            />
          </div>
    }>
      <section className="relative z-10 mx-auto max-w-7xl px-4 pb-28 pt-5 lg:px-8">
        {list.length === 0 ? (
          <div className="surface grid place-items-center p-10 text-center sm:p-14">
            <span className="grid size-16 place-items-center rounded-3xl bg-accent text-accent-foreground shadow-soft">
              <LottieIcon src={templates.length ? STICKERS.search : STICKERS.leaders} className="size-10" />
            </span>
            <p className="mt-4 text-lg font-semibold">{templates.length ? "No templates match" : "No templates yet"}</p>
            <p className="mt-1 max-w-xs text-sm text-muted-foreground">
              {templates.length ? "Try a different search." : "New templates are added soon — check back later."}
            </p>
            {searching && (
              <button
                onClick={() => setQ("")}
                className="mt-4 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-glow transition hover:-translate-y-0.5"
              >
                Clear search
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:gap-5 xl:grid-cols-4">
            {list.map((t) => (
              <Link key={t.id} to="/templates/$id" params={{ id: t.id }} className="surface group flex flex-col overflow-hidden p-1.5 transition hover:-translate-y-1 hover:border-primary/40 hover:shadow-glow active:scale-[0.99] sm:p-2">
                <div className="relative aspect-square overflow-hidden rounded-[calc(var(--radius)*1.2)] bg-muted/40">
                  {t.image ? (
                    <SmartImage src={t.image} alt={t.name} className="h-full w-full transition duration-500 group-hover:scale-105" />
                  ) : (
                    <div className="grid h-full place-items-center"><ImageIcon className="size-8 text-muted-foreground" /></div>
                  )}
                  {t.video && (
                    <span className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-card/70 px-2 py-0.5 text-[11px] backdrop-blur">
                      <LottieIcon src={STICKERS.video} className="size-4" /> Video
                    </span>
                  )}
                  <span className="absolute bottom-2 left-2 rounded-full bg-gradient-primary px-2.5 py-0.5 text-xs font-bold text-primary-foreground shadow-glow">
                    {t.price > 0 ? `₹${t.price}` : "Free"}
                  </span>
                </div>
                <div className="min-w-0 px-1.5 pb-1.5 pt-2.5 sm:px-2 sm:pt-3">
                  <h3 className="truncate text-sm font-semibold sm:text-base lg:text-lg">{t.name}</h3>
                  <span className="mt-0.5 block truncate font-mono text-[10px] font-medium text-primary sm:text-[11px]">#{productId(t.id)} · {baseApkLabel(t.base_apk)}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </AppShell>
  );
}
