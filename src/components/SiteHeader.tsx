import { Link } from "@tanstack/react-router";
import { Hammer, LayoutGrid, LogIn, LogOut, Wallet } from "lucide-react";
import { useEffect, useState } from "react";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import { toast } from "sonner";
import { useFirebase } from "@/lib/firebase";

export function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2 font-display text-lg font-bold">
      <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-gradient-primary shadow-glow">
        <Hammer className="size-4 text-primary-foreground" />
      </span>
      Builder
    </Link>
  );
}

const linkCls =
  "flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-medium text-muted-foreground transition hover:text-foreground";

function AuthButton() {
  const [user, setUser] = useState<User | null | undefined>(undefined);

  useEffect(() => {
    let unsub: (() => void) | undefined;
    useFirebase().then(({ auth }) => {
      unsub = onAuthStateChanged(auth, setUser);
    });
    return () => unsub?.();
  }, []);

  if (!user) {
    return (
      <Link to="/auth" className={linkCls}>
        <LogIn className="size-4" /> <span className="hidden sm:inline">Login</span>
      </Link>
    );
  }
  return (
    <>
      <Link to="/wallet" className={linkCls} activeProps={{ className: "bg-accent text-accent-foreground" }}>
        <Wallet className="size-4" /> <span className="hidden sm:inline">Wallet</span>
      </Link>
      <button
        onClick={async () => {
          const { auth } = await useFirebase();
          await signOut(auth);
          toast("Logged out");
        }}
        className={linkCls}
        title={user.email ?? undefined}
      >
        <LogOut className="size-4" /> <span className="hidden sm:inline">Logout</span>
      </button>
    </>
  );
}

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-3 px-4 sm:h-16">
        <Logo />
        <nav className="flex items-center gap-1">
          <Link to="/" className={linkCls} activeProps={{ className: "bg-accent text-accent-foreground" }} activeOptions={{ exact: true }}>
            <LayoutGrid className="size-4" /> <span className="hidden sm:inline">Templates</span>
          </Link>
          <AuthButton />
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-border py-8 text-center text-xs text-muted-foreground">
      © Builder ·{" "}
      <Link to="/admin" className="underline-offset-4 hover:underline">Admin</Link>
    </footer>
  );
}
