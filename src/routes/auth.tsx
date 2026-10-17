import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
} from "firebase/auth";
import { ref, set, get } from "firebase/database";
import { toast } from "sonner";
import { LogIn, UserPlus } from "lucide-react";
import { Logo, SiteFooter } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useFirebase } from "@/lib/firebase";
import { registerUser } from "@/lib/users.functions";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Login — Builder" },
      { name: "description", content: "Sign in or create your account." },
      { property: "og:title", content: "Login — Builder" },
      { property: "og:description", content: "Sign in or create your account." },
    ],
  }),
  component: AuthPage,
});

function friendlyError(code: string) {
  switch (code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "Wrong email or password";
    case "auth/email-already-in-use":
      return "This email is already registered — try logging in";
    case "auth/weak-password":
      return "Password must be at least 6 characters";
    case "auth/invalid-email":
      return "Enter a valid email address";
    default:
      return "Something went wrong — try again";
  }
}

function AuthPage() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [name, setName] = useState("");
  const [telegram, setTelegram] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const email = String(f.get("email") ?? "").trim();
    const password = String(f.get("password") ?? "");
    setLoading(true);
    try {
      const { auth, db } = await useFirebase();
      if (mode === "signup") {
        const tg = telegram.trim().replace(/^@/, "").toLowerCase();
        if (!/^[a-z0-9_]{5,32}$/.test(tg)) {
          toast.error("Enter a valid Telegram username (5-32 letters, numbers, _)");
          setLoading(false);
          return;
        }
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        // Store the user profile in Realtime Database
        await set(ref(db, `users/${cred.user.uid}`), {
          name: name.trim(),
          email,
          telegram_id: telegram.trim().replace(/^@/, "").toLowerCase(),
          created_at: new Date().toISOString(),
        });
        await registerUser({ data: { uid: cred.user.uid, email, name: name.trim(), telegram_id: telegram.trim().replace(/^@/, "").toLowerCase() } });
        toast.success("Account created — welcome!");
      } else {
        const cred = await signInWithEmailAndPassword(auth, email, password);
        await registerUser({ data: { uid: cred.user.uid, email, name: "", telegram_id: "" } }).catch(() => {});
        toast.success("Logged in");
      }
      navigate({ to: "/" });
    } catch (err) {
      const code = (err as { code?: string })?.code ?? "";
      toast.error(friendlyError(code));
    } finally {
      setLoading(false);
    }
  }

  async function googleLogin() {
    setLoading(true);
    try {
      const { auth, db } = await useFirebase();
      const cred = await signInWithPopup(auth, new GoogleAuthProvider());
      const u = cred.user;
      const profileRef = ref(db, `users/${u.uid}`);
      const snap = await get(profileRef);
      if (!snap.exists()) {
        await set(profileRef, {
          name: u.displayName ?? "",
          email: u.email ?? "",
          telegram_id: "",
          created_at: new Date().toISOString(),
        });
      }
      await registerUser({
        data: { uid: u.uid, email: u.email ?? "", name: u.displayName ?? "", telegram_id: "" },
      }).catch(() => {});
      toast.success("Logged in with Google");
      navigate({ to: "/" });
    } catch (err) {
      const code = (err as { code?: string })?.code ?? "";
      if (code !== "auth/popup-closed-by-user") toast.error(friendlyError(code));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center px-4 sm:h-16"><Logo /></div>
      </header>
      <main className="grid-bg grid flex-1 place-items-center px-4 py-10">
        <form onSubmit={submit} className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-glow backdrop-blur sm:p-8">
          <div className="grid size-12 place-items-center rounded-xl bg-primary/15">
            {mode === "login" ? <LogIn className="size-5 text-primary" /> : <UserPlus className="size-5 text-primary" />}
          </div>
          <h1 className="mt-4 text-2xl font-bold">{mode === "login" ? "Welcome back" : "Create account"}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "login" ? "Sign in to request your app build." : "Sign up to request your app build."}
          </p>

          {mode === "signup" && (
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              required
              className="mt-6"
            />
          )}
          {mode === "signup" && (
            <Input
              value={telegram}
              onChange={(e) => setTelegram(e.target.value)}
              placeholder="Telegram username (e.g. @yourname)"
              required
              className="mt-3"
            />
          )}
          <Input name="email" type="email" placeholder="Email" required autoComplete="email" className={mode === "signup" ? "mt-3" : "mt-6"} />
          <Input name="password" type="password" placeholder="Password" required minLength={6} autoComplete={mode === "login" ? "current-password" : "new-password"} className="mt-3" />

          <Button type="submit" variant="hero" className="mt-4 w-full" disabled={loading}>
            {loading ? "Please wait…" : mode === "login" ? "Login" : "Sign up"}
          </Button>

          <div className="my-4 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" />or<span className="h-px flex-1 bg-border" />
          </div>

          <Button type="button" variant="outline" className="w-full" disabled={loading} onClick={googleLogin}>
            <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
              <path fill="#4285F4" d="M23.5 12.27c0-.85-.08-1.66-.22-2.45H12v4.64h6.45a5.52 5.52 0 0 1-2.39 3.62v3h3.87c2.26-2.09 3.57-5.16 3.57-8.81z"/>
              <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.94-2.92l-3.87-3c-1.07.72-2.44 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.29v3.1A12 12 0 0 0 12 24z"/>
              <path fill="#FBBC05" d="M5.27 14.27A7.2 7.2 0 0 1 4.89 12c0-.79.14-1.56.38-2.27v-3.1H1.29a12 12 0 0 0 0 10.74l3.98-3.1z"/>
              <path fill="#EA4335" d="M12 4.77c1.76 0 3.34.61 4.58 1.8l3.44-3.44A11.98 11.98 0 0 0 12 0 12 12 0 0 0 1.29 6.63l3.98 3.1C6.22 6.88 8.87 4.77 12 4.77z"/>
            </svg>
            Continue with Google
          </Button>

          <button
            type="button"
            onClick={() => setMode(mode === "login" ? "signup" : "login")}
            className="mt-4 w-full text-center text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            {mode === "login" ? "New here? Create an account" : "Already have an account? Login"}
          </button>
        </form>
      </main>
      <SiteFooter />
    </div>
  );
}
