import { baseApkLabel } from "@/lib/base-apks";
import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { ArrowRight, Image as ImageIcon, PlayCircle, Smartphone, Zap, ShieldCheck } from "lucide-react";
import { SiteHeader, SiteFooter } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { productId } from "@/lib/product-id";
import { listTemplates } from "@/lib/builder.functions";

export const templatesQuery = queryOptions({ queryKey: ["templates"], queryFn: () => listTemplates() });

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Builder — HTML templates to Android APK" },
      { name: "description", content: "Browse ready-made app templates, preview them, and request your own APK build." },
      { property: "og:title", content: "Builder — HTML templates to Android APK" },
      { property: "og:description", content: "Browse ready-made app templates, preview them, and request your own APK build." },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(templatesQuery),
  component: Index,
});

function Index() {
  const { data: templates } = useSuspenseQuery(templatesQuery);
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <section className="mx-auto max-w-5xl px-4 pb-6 pt-10 text-center sm:pt-16">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1 text-xs font-medium text-accent-foreground">
          <Zap className="size-3.5" /> HTML to Android APK
        </span>
        <h1 className="mx-auto mt-4 max-w-2xl text-3xl font-bold leading-tight sm:text-5xl">
          Pick a template. <span className="text-gradient">Get your app.</span>
        </h1>
        <p className="mx-auto mt-3 max-w-md text-base text-muted-foreground">
          Preview a template and share its Product ID with the admin to get your app.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button variant="hero" size="lg" asChild>
            <a href="#templates">Browse templates <ArrowRight /></a>
          </Button>
        </div>
        <div className="mt-6 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
          <span className="flex items-center gap-2"><Smartphone className="size-4 text-primary" /> Native Android APK</span>
          <span className="flex items-center gap-2"><ShieldCheck className="size-4 text-primary" /> Admin-reviewed</span>
        </div>
      </section>

      <section id="templates" className="mx-auto max-w-5xl px-4 py-10 sm:py-14">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-bold">Templates</h2>
            <p className="mt-1 text-muted-foreground">{templates.length} available</p>
          </div>
        </div>
        {templates.length === 0 ? (
          <div className="grid place-items-center rounded-2xl border border-dashed border-border p-10 text-center">
            <ImageIcon className="size-10 text-muted-foreground" />
            <p className="mt-3 font-medium">No templates yet</p>
            <p className="text-sm text-muted-foreground">The admin will add templates soon.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
            {templates.map((t) => (
              <Link
                key={t.id}
                to="/templates/$id"
                params={{ id: t.id }}
                className="group overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition active:scale-[0.99] hover:border-primary/40 hover:shadow-glow"
              >
                <div className="relative aspect-video bg-muted">
                  {t.image ? (
                    <img src={t.image} alt={t.name} loading="lazy" className="h-full w-full object-cover transition group-hover:scale-105" />
                  ) : (
                    <div className="grid h-full place-items-center"><ImageIcon className="size-8 text-muted-foreground" /></div>
                  )}
                  {t.video && (
                    <span className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-card/90 px-2 py-1 text-xs backdrop-blur">
                      <PlayCircle className="size-3.5 text-primary" /> Video
                    </span>
                  )}
                </div>
                <div className="p-4">
                  <span className="font-mono text-xs font-medium text-primary">#{productId(t.id)} · {baseApkLabel(t.base_apk)}</span>
                  <h3 className="mt-1 text-lg font-semibold">{t.name}</h3>
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{t.description || "No description"}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
      <SiteFooter />
    </div>
  );
}
