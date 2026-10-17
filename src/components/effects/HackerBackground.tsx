// Adapted from Eldora UI HackerBackground (MIT): https://eldoraui.site/r/hacker-background.json
import { useEffect, useRef } from "react";

export function HackerBackground() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    let drops: number[] = [];
    let frame = 0;
    let last = 0;
    let ink = "";
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%";
    const resize = () => {
      canvas.width = canvas.clientWidth;
      canvas.height = canvas.clientHeight;
      drops = Array.from({ length: Math.ceil(canvas.width / 22) }, () => Math.random() * canvas.height / 22);
    };
    const palette = () => { ink = getComputedStyle(document.documentElement).getPropertyValue("--hacker-ink").trim(); };
    const draw = (now: number) => {
      if (now - last > 65) {
        last = now;
        ctx.globalCompositeOperation = "destination-out";
        ctx.globalAlpha = 0.08;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.globalCompositeOperation = "source-over";
        ctx.globalAlpha = 1;
        ctx.fillStyle = ink;
        ctx.font = "14px monospace";
        drops.forEach((drop, i) => {
          ctx.fillText(chars[Math.floor(Math.random() * chars.length)] ?? "0", i * 22, drop * 22);
          drops[i] = drop * 22 > canvas.height && Math.random() > 0.975 ? 0 : drop + 0.45;
        });
      }
      if (!reduced.matches && !document.hidden) frame = requestAnimationFrame(draw);
    };
    const restart = () => { cancelAnimationFrame(frame); if (!document.hidden) frame = requestAnimationFrame(draw); };
    resize(); palette(); restart();
    const observer = new MutationObserver(palette);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", restart);
    reduced.addEventListener("change", restart);
    return () => { cancelAnimationFrame(frame); observer.disconnect(); window.removeEventListener("resize", resize); document.removeEventListener("visibilitychange", restart); reduced.removeEventListener("change", restart); };
  }, []);
  return <canvas ref={ref} aria-hidden="true" className="hacker-background" />;
}