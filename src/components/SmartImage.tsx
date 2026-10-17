import { useState } from "react";
import { ImageOff, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

/** Remote image with placeholder, fade-in and a retry fallback (no automatic reload loops). */
export function SmartImage({ src, alt, className, lazy = true }: { src: string; alt: string; className?: string; lazy?: boolean }) {
  const [state, setState] = useState<"loading" | "ok" | "error">("loading");
  const [attempt, setAttempt] = useState(0);
  if (state === "error") {
    return (
      <div className={cn("grid place-items-center bg-muted text-muted-foreground", className)}>
        <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setAttempt((a) => a + 1); setState("loading"); }} className="flex flex-col items-center gap-1 text-xs" aria-label="Retry loading image">
          <ImageOff className="size-6" /><span className="inline-flex items-center gap-1"><RefreshCw className="size-3" /> Retry</span>
        </button>
      </div>
    );
  }
  return (
    <span className={cn("relative block overflow-hidden", state === "loading" && "skeleton-shimmer", className)}>
      <img
        key={attempt}
        src={attempt ? `${src}${src.includes("?") ? "&" : "?"}r=${attempt}` : src}
        alt={alt}
        loading={lazy ? "lazy" : "eager"}
        decoding="async"
        onLoad={() => setState("ok")}
        onError={() => setState("error")}
        className={cn("img-fade h-full w-full object-cover", state === "ok" && "is-loaded")}
      />
    </span>
  );
}
