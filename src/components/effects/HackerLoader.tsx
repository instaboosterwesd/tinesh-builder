import { Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { LottieIcon } from "@/components/effects/LottieIcon";
import { cn } from "@/lib/utils";
import loaderAsset from "@/assets/iconscout-loader.json.asset.json";

/** Inline busy state for buttons: small spinner + action label ("Saving…"). */
export function HackerLoader({ label = "Loading", className }: { compact?: boolean; label?: string; className?: string }) {
  return (
    <span role="status" aria-live="polite" className={cn("inline-flex items-center gap-2", className)}>
      <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden />
      <span>{label}…</span>
    </span>
  );
}

/** Animated IconScout loader for full-section waits. */
export function BrandLoader({ className = "size-16" }: { className?: string }) {
  return <LottieIcon src={loaderAsset.url} className={className} />;
}

/** List-style skeleton used while account pages load. */
export function LoadingPanel() {
  return (
    <div className="mx-auto w-full max-w-3xl space-y-3 px-4 py-6" aria-busy="true" role="status" aria-label="Loading">
      <div className="flex justify-center"><BrandLoader className="size-14" /></div>
      <Skeleton className="h-6 w-2/5" />
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex items-center gap-4 border-b border-border py-4">
          <Skeleton className="size-12 shrink-0" />
          <div className="flex-1 space-y-3"><Skeleton className="h-4 w-3/4" /><Skeleton className="h-3 w-1/2" /></div>
        </div>
      ))}
    </div>
  );
}

/** Card grid skeleton matching the home template cards. */
export function SkeletonGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3" aria-busy="true" role="status" aria-label="Loading templates">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="surface overflow-hidden">
          <Skeleton className="aspect-[4/3] w-full rounded-none sm:aspect-video" />
          <div className="space-y-2 p-3 sm:p-4"><Skeleton className="h-4 w-3/4" /><Skeleton className="h-3 w-1/2" /></div>
        </div>
      ))}
    </div>
  );
}

/** Detail page skeleton: big preview + side panel. */
export function DetailSkeleton() {
  return (
    <div className="mx-auto grid max-w-6xl gap-6 px-4 py-8 lg:grid-cols-[1fr_360px]" aria-busy="true" role="status" aria-label="Loading template">
      <Skeleton className="aspect-video w-full rounded-2xl" />
      <div className="space-y-3"><Skeleton className="h-8 w-3/4" /><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-5/6" /><Skeleton className="mt-6 h-12 w-full" /></div>
    </div>
  );
}
