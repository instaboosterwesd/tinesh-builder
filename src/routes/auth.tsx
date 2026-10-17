import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { LoginScreen } from "@/components/LoginScreen";
import { createUserWithEmailAndPassword, GoogleAuthProvider, signInWithEmailAndPassword, signInWithPopup, updateProfile } from "firebase/auth";
import { fbAuth, firebaseReady } from "@/integrations/firebase/client";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Login — AppForge" }, { name: "description", content: "Sign in or create your account." }, { property: "og:title", content: "Login — AppForge" }, { property: "og:description", content: "Sign in or create your AppForge account." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: AuthPage,
});

function friendly(err: unknown): string {
  const code = (err as { code?: string })?.code ?? "";
  if (code.includes("invalid-credential") || code.includes("wrong-password") || code.includes("user-not-found")) return "Wrong email or password";
  if (code.includes("email-already-in-use")) return "This email is already registered";
  if (code.includes("weak-password")) return "Password is too weak";
  if (code.includes("popup-closed")) return "Sign-in was cancelled";
  if (code.includes("unauthorized-domain")) return "This website is not allowed in Firebase sign-in settings";
  return "Something went wrong. Please try again.";
}

function AuthPage() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [loading, setLoading] = useState(false);
  const [busyAction, setBusyAction] = useState<"email" | "google" | null>(null);
  const navigate = useNavigate();
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const email = String(f.get("email")), password = String(f.get("password"));
    setLoading(true);
    setBusyAction("email");
    try {
      await firebaseReady();
      if (mode === "login") await signInWithEmailAndPassword(fbAuth(), email, password);
      else {
        const cred = await createUserWithEmailAndPassword(fbAuth(), email, password);
        await updateProfile(cred.user, { displayName: String(f.get("name") ?? "") });
        toast.success("Account created");
      }
      navigate({ to: "/" });
    } catch (err) {
      toast.error(friendly(err));
    } finally {
      setLoading(false);
      setBusyAction(null);
    }
  }
  async function google() {
    if (loading) return;
    setLoading(true);
    setBusyAction("google");
    try {
      await firebaseReady();
      await signInWithPopup(fbAuth(), new GoogleAuthProvider());
      navigate({ to: "/" });
    } catch (err) {
      toast.error(friendly(err));
    } finally {
      setLoading(false);
      setBusyAction(null);
    }
  }
  return <LoginScreen mode={mode} loading={loading} busyAction={busyAction} onSubmit={submit} onGoogle={google} onModeChange={() => setMode(mode === "login" ? "signup" : "login")} />;
}
