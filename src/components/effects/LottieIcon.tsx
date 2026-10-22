import { useEffect, useRef } from "react";
import type { AnimationItem } from "lottie-web";
import { getDevicePerformance, useDevicePerformance } from "@/lib/device-performance";
import { stickerEmojiFor } from "@/lib/stickers";

// Shared caches so each emoji file and the player are fetched only once.
let lottiePromise: Promise<typeof import("lottie-web")> | null = null;
const dataCache = new Map<string, Promise<unknown>>();

function loadLottie() {
  if (!lottiePromise) lottiePromise = import("lottie-web/build/player/lottie_light");
  return lottiePromise;
}

function loadData(src: string) {
  let p = dataCache.get(src);
  if (!p) {
    p = fetch(src, { cache: "force-cache" }).then(async (res) => {
      if (!res.ok || !res.body) throw new Error("Emoji unavailable");
      // .tgs = gzipped Lottie JSON (Telegram sticker), ~10x smaller to download.
      if (src.endsWith(".tgs")) {
        const text = await new Response(res.body.pipeThrough(new DecompressionStream("gzip"))).text();
        return JSON.parse(text);
      }
      return res.json();
    });
    p.catch(() => dataCache.delete(src));
    dataCache.set(src, p);
  }
  return p;
}

/** Start downloading emojis early (call in browser effects). */
export function preloadLottie(srcs: string[]) {
  if (getDevicePerformance() === "low") return;
  loadLottie().catch(() => {});
  srcs.forEach((s) => loadData(s).catch(() => {}));
}

export function LottieIcon({ src, className = "size-6" }: { src: string; className?: string }) {
  const performance = useDevicePerformance();
  const Icon = performance === "low" ? stickerIconFor(src) : undefined;
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (Icon || getDevicePerformance() === "low") return;
    let active = true;
    let animation: AnimationItem | undefined;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    Promise.all([loadLottie(), loadData(src)]).then(([module, animationData]) => {
      if (!active || !ref.current) return;
      const lottie = (module as { default: typeof import("lottie-web").default }).default;
      animation = lottie.loadAnimation({ container: ref.current, renderer: "svg", animationData: structuredClone(animationData), loop: true, autoplay: !motion.matches });
    }).catch(() => {});
    const update = () => { if (motion.matches) animation?.pause(); else animation?.play(); };
    motion.addEventListener("change", update);
    return () => { active = false; animation?.destroy(); motion.removeEventListener("change", update); };
  }, [src, Icon]);
  if (Icon) {
    return (
      <span key="icon" aria-hidden="true" className={`inline-grid shrink-0 place-items-center text-primary ${className}`}>
        <Icon className="size-[80%]" strokeWidth={2.2} />
      </span>
    );
  }
  return <span key="lottie" ref={ref} aria-hidden="true" className={`inline-block shrink-0 ${className}`} />;
}
