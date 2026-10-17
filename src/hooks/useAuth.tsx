import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { fbAuth, firebaseReady } from "@/integrations/firebase/client";
import { recordLogin } from "@/lib/users.functions";

type AuthState = { user: User | null; loading: boolean };
const Ctx = createContext<AuthState>({ user: null, loading: true });

function maybeRecordLogin(user: User | null) {
  if (!user) return;
  const key = "builder-login-recorded";
  const stamp = `${user.uid}:${user.metadata.lastSignInTime ?? ""}`;
  if (localStorage.getItem(key) === stamp) return;
  localStorage.setItem(key, stamp);
  setTimeout(() => recordLogin({ data: { user_agent: navigator.userAgent.slice(0, 400) } }).catch(() => {}), 0);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ user: null, loading: true });
  useEffect(() => {
    let unsub = () => {};
    let alive = true;
    firebaseReady()
      .then(() => {
        if (!alive) return;
        unsub = onAuthStateChanged(fbAuth(), (user) => {
          setState({ user, loading: false });
          maybeRecordLogin(user);
        });
      })
      .catch(() => setState({ user: null, loading: false }));
    return () => { alive = false; unsub(); };
  }, []);
  return <Ctx.Provider value={state}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);
