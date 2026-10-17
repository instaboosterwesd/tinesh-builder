import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getDatabase, type Database } from "firebase/database";
import { getFirebaseConfig } from "@/lib/firebase.functions";

type Firebase = { app: FirebaseApp; auth: Auth; db: Database };

let cached: Firebase | null = null;
let pending: Promise<Firebase> | null = null;

export function useFirebase(): Promise<Firebase> {
  if (cached) return Promise.resolve(cached);
  if (!pending) {
    pending = (async () => {
      const config = await getFirebaseConfig();
      const app = getApps()[0] ?? initializeApp(config);
      const fb: Firebase = { app, auth: getAuth(app), db: getDatabase(app) };
      cached = fb;
      return fb;
    })();
  }
  return pending;
}
