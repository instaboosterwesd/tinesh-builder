import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { SkeletonGrid } from "@/components/effects/HackerLoader";
import { LinkCard, TemplateCard } from "@/components/CatalogCards";
import { categoriesQuery, templatesQuery } from "@/lib/catalog-queries";
import type { Template } from "@/lib/builder.functions";

export const Route = createFileRoute("/category/$id")({
  head: () => ({
    meta: [
      { title: "Category — AppForge" },
      { name: "description", content: "Browse templates and offers in this category." },
      { property: "og:title", content: "Category — AppForge" },
      { property: "og:description", content: "Browse templates and offers in this category." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: ({ context }) => Promise.all([context.queryClient.ensureQueryData(templatesQuery), context.queryClient.ensureQueryData(categoriesQuery)]),
  pendingComponent: () => <AppShell><main className="mx-auto max-w-6xl px-4 py-6"><SkeletonGrid /></main></AppShell>,
  pendingMs: 200,
  component: CategoryPage,
});

function CategoryPage() {
  const { id } = Route.useParams();
  const { data: templates } = useSuspenseQuery(templatesQuery);
  const { data: categories } = useSuspenseQuery(categoriesQuery);
  const c = categories.find((x) => x.id === id);
  const byId = new Map(templates.map((t) => [t.id, t]));
  const items = !c ? [] : c.all_templates ? templates : c.template_ids.map((t) => byId.get(t)).filter((t): t is Template => !!t);
  return (
    <AppShell>
      <section className="relative z-10 mx-auto max-w-7xl px-4 pb-28 pt-5 lg:px-8">
        <div className="mb-4 flex items-center gap-3">
          <Link to="/" aria-label="Back to categories" className="surface grid size-10 shrink-0 place-items-center rounded-2xl transition hover:-translate-y-0.5"><ArrowLeft className="size-5" /></Link>
          <h1 className="truncate text-xl font-bold sm:text-2xl">{c?.name ?? "Category not found"}</h1>
        </div>
        {c && (items.length || c.cards.length) ? (
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:gap-5 xl:grid-cols-4">
            {items.map((t) => <TemplateCard key={t.id} t={t} />)}
            {c.cards.map((k) => <LinkCard key={k.id} k={k} />)}
          </div>
        ) : (
          <div className="surface p-10 text-center text-sm text-muted-foreground">{c ? "Nothing here yet." : "This category was removed."}</div>
        )}
      </section>
    </AppShell>
  );
}
