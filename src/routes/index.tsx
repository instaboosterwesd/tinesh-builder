import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { FolderOpen, Image as ImageIcon } from "lucide-react";
import { LottieIcon, preloadLottie } from "@/components/effects/LottieIcon";
import { STICKERS } from "@/lib/stickers";
import { AppShell } from "@/components/AppShell";
import { Input } from "@/components/ui/input";
import { baseApkLabel } from "@/lib/base-apks";
import { matchesProduct, productId } from "@/lib/product-id";
import { listTemplates, type Template } from "@/lib/builder.functions";
import { listCategories, type CategoryCard } from "@/lib/categories.functions";
import { SmartImage } from "@/components/SmartImage";
import { TemplateGrid } from "@/components/CatalogCards";
import { templatesQuery, categoriesQuery } from "@/lib/catalog-queries";
import { SkeletonGrid } from "@/components/effects/HackerLoader";


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
  loader: ({ context }) => Promise.all([context.queryClient.ensureQueryData(templatesQuery), context.queryClient.ensureQueryData(categoriesQuery)]),
  pendingComponent: () => <AppShell><main className="mx-auto max-w-6xl px-4 py-6"><SkeletonGrid /></main></AppShell>,
  pendingMs: 200,
  component: Index,
});

function Index() {
  const { data: templates } = useSuspenseQuery(templatesQuery);
  const { data: categories } = useSuspenseQuery(categoriesQuery);
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
        {list.length === 0 && (searching || categories.length === 0) ? (
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
          searching || categories.length === 0 ? <TemplateGrid list={list} /> : (
            <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:gap-5 xl:grid-cols-4">
              {categories.map((c) => (
                <Link key={c.id} to="/category/$id" params={{ id: c.id }} className="surface group flex flex-col overflow-hidden p-1.5 transition hover:-translate-y-1 hover:border-primary/40 hover:shadow-glow active:scale-[0.99] sm:p-2">
                  <div className="relative aspect-square overflow-hidden rounded-[calc(var(--radius)*1.2)] bg-muted/40">
                    {c.image ? <SmartImage src={c.image} alt={c.name} className="h-full w-full transition duration-500 group-hover:scale-105" /> : <div className="grid h-full place-items-center"><FolderOpen className="size-10 text-primary" /></div>}
                  </div>
                  <div className="min-w-0 px-1.5 pb-1.5 pt-2.5 sm:px-2 sm:pt-3">
                    <h3 className="truncate text-sm font-semibold sm:text-base lg:text-lg">{c.name}</h3>
                    <span className="mt-0.5 block text-[11px] text-muted-foreground">{(c.all_templates ? templates.length : c.template_ids.length) + c.cards.length} items</span>
                  </div>
                </Link>
              ))}
            </div>
          )
        )}
      </section>
    </AppShell>
  );
}

