import { Link, useNavigate, useMatchRoute, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Moon, Sun, LogIn } from "lucide-react";
import logoImg from "@/assets/logo.png";
import { useEffect, useState, type ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/lib/theme";
import { getWalletInfo } from "@/lib/wallet.functions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { withRequestTimeout } from "@/lib/request-timeout";
import { useSiteName } from "@/hooks/useSiteSettings";
import { LoadingPanel } from "@/components/effects/HackerLoader";
import { LottieIcon, preloadLottie } from "@/components/effects/LottieIcon";
import { STICKERS } from "@/lib/stickers";

export function Logo({ to = "/" }: { to?: "/" }) {
  const name = useSiteName();
  return (
    <Link to={to} className="flex min-w-0 items-center gap-2 font-display text-lg font-bold">
      <img src={logoImg} alt={`${name} logo`} width={32} height={32} className="size-8 shrink-0 shadow-glow rounded-xl" />
      <span className="line-clamp-2 break-words text-sm leading-tight sm:text-lg">{name}</span>
    </Link>
  );
}

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggle } = useTheme();
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggle}
      aria-label="Toggle theme"
      className={cn("rounded-full", className)}
    >
      {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </Button>
  );
}

export const walletQuery = { queryKey: ["wallet"], queryFn: () => getWalletInfo() };

export function useWallet() {
  const { user } = useAuth();
  const fetchWallet = useServerFn(getWalletInfo);
  return useQuery({ queryKey: [...walletQuery.queryKey, user?.uid], queryFn: () => withRequestTimeout(() => fetchWallet()), enabled: !!user, retry: false, staleTime: 30_000 });
}

const NAV = [
  { to: "/", label: "Home", emoji: STICKERS.home },
  { to: "/wallet", label: "Wallet", emoji: STICKERS.wallet },
  { to: "/orders", label: "Orders", emoji: STICKERS.orders },
  { to: "/leaderboard", label: "Leaders", emoji: STICKERS.leaders },
  { to: "/profile", label: "Profile", emoji: STICKERS.profile },
] as const;

function DockLink({ to, label, emoji }: (typeof NAV)[number]) {
  const matchRoute = useMatchRoute();
  const { user } = useAuth();
  const active = matchRoute({ to });
  const dest = user || to === "/" ? to : "/auth";
  return (
    <Link
      to={dest}
      title={label}
      aria-label={label}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-full px-2 py-2 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        active ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
      )}
    >
      <LottieIcon
        src={emoji}
        className={cn(
          "size-7 transition-transform duration-300 group-hover:scale-115",
          active && "scale-110",
        )}
      />
      <span
        className={cn(
          "whitespace-nowrap text-[10px] sm:text-xs",
        )}
      >
        {label}
      </span>
    </Link>
  );
}

function CapsuleDock({ hidden }: { hidden: boolean }) {
  useEffect(() => { preloadLottie(NAV.map((n) => n.emoji)); }, []);
  return (
    <nav
      aria-label="Main navigation"
      aria-hidden={hidden || undefined}
      inert={hidden}
      data-hidden={hidden ? "" : undefined}
      className="auto-hide-dock fixed inset-x-0 bottom-0 z-50 flex justify-center px-3 pb-safe"
    >
      <div className="capsule-dock dock-in flex w-full max-w-lg items-center gap-1 border border-border/60 p-1.5">
        {NAV.map((item) => (
          <DockLink key={item.to} {...item} />
        ))}
        <span aria-hidden className="mx-1 h-6 w-px shrink-0 bg-border" />
        <ThemeToggle className="size-9 shrink-0 hover:bg-accent" />
      </div>
    </nav>
  );
}

// Hide only the bottom navigation while scrolling down; reveal on scroll up.
function useHideOnScroll(enabled: boolean) {
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    if (!enabled) { setHidden(false); return; }
    let last = window.scrollY;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const y = window.scrollY;
        const d = y - last;
        if (y < 64) setHidden(false);
        else if (d > 6) setHidden(true);
        else if (d < -6) setHidden(false);
        if (Math.abs(d) > 6) last = y;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => { window.removeEventListener("scroll", onScroll); cancelAnimationFrame(raf); };
  }, [enabled]);
  return hidden;
}

export function AppShell({ children, search }: { children: ReactNode; search?: ReactNode }) {
  const { user } = useAuth();
  const { data: wallet } = useWallet();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const showHeader = pathname === "/";
  const hidden = useHideOnScroll(true);
  return (
    <div className="user-shell min-h-screen pb-28">
      {showHeader && (<header className="home-header sticky top-0 z-40 border-b border-glass-border">
        <div className="mx-auto grid max-w-7xl grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_minmax(0,1fr)]">
          <div className="min-w-0"><Logo /></div>
          <div className="col-span-2 row-start-2 min-w-0 sm:col-span-1 sm:col-start-2 sm:row-start-1">{search}</div>
          <div className="col-start-2 row-start-1 flex items-center justify-end gap-2 sm:col-start-3">
            {user ? (
              <Link
                to="/wallet"
                className="flex items-center gap-1.5 rounded-full border glass-panel px-3.5 py-2 text-sm font-semibold transition hover:-translate-y-0.5"
              >
                <LottieIcon src={STICKERS.wallet} className="size-5" /> {wallet ? `₹${wallet.balance}` : "—"}
              </Link>
            ) : (
              <Button asChild size="sm" variant="hero" className="rounded-full">
                <Link to="/auth">
                  <LogIn className="size-4" /> Login
                </Link>
              </Button>
            )}
          </div>
        </div>
      </header>)}
      {!showHeader && <div className="h-4" aria-hidden />}
      {children}
      <CapsuleDock hidden={hidden} />
    </div>
  );
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-5 flex items-end justify-between gap-3">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold sm:text-3xl">{title}{title === "Profile" ? <LottieIcon src={STICKERS.verifiedBadge} className="size-7" /> : title === "Leaderboard" ? <LottieIcon src={STICKERS.leaders} className="size-7" /> : null}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth", replace: true });
  }, [loading, user, navigate]);
  if (loading) return <LoadingPanel />;
  if (!user) {
    return (
      <div className="surface mx-auto mt-6 max-w-sm p-8 text-center">
        <LogIn className="mx-auto size-8 text-primary" />
        <h2 className="mt-3 text-lg font-semibold">Login required</h2>
        <p className="mt-1 text-sm text-muted-foreground">Sign in to continue.</p>
        <Button variant="hero" className="mt-5 w-full" onClick={() => navigate({ to: "/auth" })}>Login / Sign up</Button>
      </div>
    );
  }
  return <>{children}</>;
}

export function SupportLink({ className, children }: { className?: string; children: ReactNode }) {
  const { data } = useQuery({ queryKey: ["site-settings"], enabled: false }) as { data?: { support_link?: string } };
  const link = data?.support_link;
  if (!link) return null;
  return (
    <a href={link} target="_blank" rel="noreferrer" className={className}>
      {children}
    </a>
  );
}
