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
import { listTemplates, type Template } from "@/lib/builder.functions";
import { listCategories, type CategoryCard } from "@/lib/categories.functions";
import { SmartImage } from "@/components/SmartImage";
import { SkeletonGrid } from "@/components/effects/HackerLoader";

export const templatesQuery = queryOptions({ queryKey: ["templates"], queryFn: () => listTemplates() });
const categoriesQuery = queryOptions({ queryKey: ["categories"], queryFn: () => listCategories() });

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
  const byId = useMemo(() => new Map(templates.map((t) => [t.id, t])), [templates]);
  const rest = useMemo(() => {
    const used = new Set(categories.flatMap((c) => c.template_ids));
    return templates.filter((t) => !used.has(t.id));
  }, [templates, categories]);

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
        {list.length === 0 && (searching || !categories.some((c) => c.cards.length)) ? (
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
            <div className="space-y-8">
              {categories.map((c) => {
                const items = c.template_ids.map((id) => byId.get(id)).filter((t): t is Template => !!t);
                if (!items.length && !c.cards.length) return null;
                return (
                  <div key={c.id}>
                    <h2 className="mb-3 text-lg font-bold sm:text-xl">{c.name}</h2>
                    <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:gap-5 xl:grid-cols-4">
                      {items.map((t) => <TemplateCard key={t.id} t={t} />)}
                      {c.cards.map((k) => <LinkCard key={k.id} k={k} />)}
                    </div>
                  </div>
                );
              })}
              {rest.length > 0 && (
                <div>
                  <h2 className="mb-3 text-lg font-bold sm:text-xl">More templates</h2>
                  <TemplateGrid list={rest} />
                </div>
              )}
            </div>
          )
        )}
      </section>
    </AppShell>
  );
}

function TemplateCard({ t }: { t: Template }) {
  return (
    <Link to="/templates/$id" params={{ id: t.id }} className="surface group flex flex-col overflow-hidden p-1.5 transition hover:-translate-y-1 hover:border-primary/40 hover:shadow-glow active:scale-[0.99] sm:p-2">
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
  );
}

function TemplateGrid({ list }: { list: Template[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:gap-5 xl:grid-cols-4">
      {list.map((t) => <TemplateCard key={t.id} t={t} />)}
    </div>
  );
}

function LinkCard({ k }: { k: CategoryCard }) {
  return (
    <a href={k.link} target="_blank" rel="noopener noreferrer" className="surface group flex flex-col overflow-hidden p-1.5 transition hover:-translate-y-1 hover:border-primary/40 hover:shadow-glow active:scale-[0.99] sm:p-2">
      <div className="relative aspect-square overflow-hidden rounded-[calc(var(--radius)*1.2)] bg-muted/40">
        <SmartImage src={k.image} alt={k.name} className="h-full w-full transition duration-500 group-hover:scale-105" />
      </div>
      <div className="min-w-0 px-1.5 pb-1.5 pt-2.5 sm:px-2 sm:pt-3">
        <h3 className="truncate text-sm font-semibold sm:text-base lg:text-lg">{k.name}</h3>
        <span className="mt-2 block rounded-full bg-gradient-primary px-3 py-1.5 text-center text-xs font-bold text-primary-foreground shadow-glow">{k.button || "Buy Now"}</span>
      </div>
    </a>
  );
}
