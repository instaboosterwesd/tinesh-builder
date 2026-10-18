import { Link } from "@tanstack/react-router";
import { Image as ImageIcon } from "lucide-react";
import { LottieIcon } from "@/components/effects/LottieIcon";
import { STICKERS } from "@/lib/stickers";
import { baseApkLabel } from "@/lib/base-apks";
import { productId } from "@/lib/product-id";
import { SmartImage } from "@/components/SmartImage";
import type { Template } from "@/lib/builder.functions";
import type { CategoryCard } from "@/lib/categories.functions";

export function TemplateCard({ t }: { t: Template }) {
  return (
    <Link to="/templates/$id" params={{ id: t.id }} data-sound={`tpl_${t.id}`} className="surface group flex flex-col overflow-hidden p-1.5 transition hover:-translate-y-1 hover:border-primary/40 hover:shadow-glow active:scale-[0.99] sm:p-2">
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

export function TemplateGrid({ list }: { list: Template[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:gap-5 xl:grid-cols-4">
      {list.map((t) => <TemplateCard key={t.id} t={t} />)}
    </div>
  );
}

export function LinkCard({ k }: { k: CategoryCard }) {
  return (
    <a href={k.link} data-sound={`card_${k.id}`} target="_blank" rel="noopener noreferrer" className="surface group flex flex-col overflow-hidden p-1.5 transition hover:-translate-y-1 hover:border-primary/40 hover:shadow-glow active:scale-[0.99] sm:p-2">
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
