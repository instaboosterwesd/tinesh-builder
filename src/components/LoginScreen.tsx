import { useEffect, useRef } from "react";
import { ArrowRight, Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { HackerLoader } from "@/components/effects/HackerLoader";
import { LottieIcon, preloadLottie } from "@/components/effects/LottieIcon";
import video from "@/assets/login-bg.mp4.asset.json";
import { STICKERS } from "@/lib/stickers";

const LOGIN_STICKERS = [STICKERS.welcome, STICKERS.google, STICKERS.lock, STICKERS.editProfile, STICKERS.proceed, STICKERS.shield, STICKERS.sendFlash];

type Props = {
  mode: "login" | "signup";
  loading: boolean;
  busyAction?: "email" | "google" | null;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onGoogle: () => void;
  onModeChange: () => void;
};

export function LoginScreen({ mode, loading, busyAction, onSubmit, onGoogle, onModeChange }: Props) {
  const [showPassword, setShowPassword] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const cardRef = useRef<HTMLFormElement>(null);
  useEffect(() => { preloadLottie(LOGIN_STICKERS); }, []);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => { if (media.matches) videoRef.current?.pause(); else videoRef.current?.play().catch(() => {}); };
    update(); media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  return <main className="login-screen grid min-h-dvh place-items-center px-4 py-10">
    <video ref={videoRef} className="login-video" src={video.url} autoPlay muted loop playsInline aria-hidden="true" />
    <div className="login-video-overlay" aria-hidden="true" />
    <form ref={cardRef} onSubmit={onSubmit} className="login-card w-full max-w-[420px] space-y-5 p-7 sm:p-9" onPointerMove={(event) => {
      const card = cardRef.current;
      if (!card) return;
      const rect = card.getBoundingClientRect();
      card.style.setProperty("--pointer-x", `${event.clientX - rect.left}px`);
      card.style.setProperty("--pointer-y", `${event.clientY - rect.top}px`);
    }}>
      <div className="pb-1">
        <h1 className="flex items-center gap-2.5 text-2xl font-bold sm:text-3xl">{mode === "login" ? "Welcome back" : "Create account"}<LottieIcon src={STICKERS.welcome} className="size-9" /></h1>
        <p className="login-muted mt-2 flex items-center gap-1.5 text-sm"><LottieIcon src={STICKERS.shield} className="size-4" />{mode === "login" ? "Sign in to your account" : "Start building your next app"}</p>
      </div>
      {mode === "signup" && <div className="space-y-2"><label htmlFor="auth-name" className="flex items-center gap-2 text-sm font-medium"><LottieIcon src={STICKERS.editProfile} className="size-6" />Your name</label><Input id="auth-name" name="name" autoComplete="name" placeholder="Your name" required disabled={loading} /></div>}
      <div className="space-y-2"><label htmlFor="auth-email" className="flex items-center gap-2 text-sm font-medium"><LottieIcon src={STICKERS.sendFlash} className="size-6" />Email</label><Input id="auth-email" name="email" type="email" autoComplete="email" placeholder="you@example.com" required disabled={loading} /></div>
      <div className="space-y-2"><label htmlFor="auth-password" className="flex items-center gap-2 text-sm font-medium"><LottieIcon src={STICKERS.lock} className="size-6" />Password</label><div className="relative"><Input id="auth-password" name="password" type={showPassword ? "text" : "password"} autoComplete={mode === "login" ? "current-password" : "new-password"} placeholder="Your password" required minLength={6} disabled={loading} className="pr-12" /><Button type="button" size="icon" variant="ghost" aria-label={showPassword ? "Hide password" : "Show password"} className="absolute right-1 top-1 size-9" onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</Button></div></div>
      <Button type="submit" variant="hero" className="h-12 w-full" disabled={loading}>{loading && busyAction !== "google" ? <HackerLoader compact label="Signing in" /> : <>{mode === "login" ? "Login" : "Sign up"}<LottieIcon src={STICKERS.proceed} className="size-5" /></>}</Button>
      <div className="flex items-center gap-3 text-xs login-muted"><span className="h-px flex-1 bg-current opacity-20" />or<span className="h-px flex-1 bg-current opacity-20" /></div>
      <Button type="button" variant="outline" className="login-alternate h-12 w-full" onClick={onGoogle} disabled={loading}>{busyAction === "google" ? <HackerLoader compact label="Connecting to Google" /> : <><LottieIcon src={STICKERS.google} className="size-5" />Continue with Google</>}</Button>
      <Button type="button" variant="link" disabled={loading} className="login-muted h-auto w-full whitespace-normal px-0 text-sm" onClick={onModeChange}>{mode === "login" ? "New here? Create an account" : "Already have an account? Login"}<ArrowRight className="size-4 shrink-0" /></Button>
    </form>
  </main>;
}
