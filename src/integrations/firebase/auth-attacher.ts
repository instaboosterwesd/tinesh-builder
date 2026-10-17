// Client-side function middleware: attaches the signed-in user's Firebase ID
// token to every server-fn call. Registered in src/start.ts.
import { createMiddleware } from "@tanstack/react-start";
import { fbAuthIfReady } from "./client";

export const attachFirebaseAuth = createMiddleware({ type: "function" }).client(async ({ next }) => {
  try {
    // Never call firebaseReady() here: it fetches the config through a server
    // function, which would re-enter this middleware and loop forever.
    const a = fbAuthIfReady();
    if (a) await a.authStateReady();
    const user = a?.currentUser ?? null;
    const token = user ? await user.getIdToken() : null;
    return next({ headers: token ? { Authorization: `Bearer ${token}` } : {} });
  } catch {
    return next({ headers: {} });
  }
});
