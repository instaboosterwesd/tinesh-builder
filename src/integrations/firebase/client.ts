// Firebase client SDK — lazy async init so the apiKey (served by a server
// function from the secret store) never sits in the client bundle.
import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getDatabase, type Database } from "firebase/database";
import { getFirebaseConfig } from "@/lib/firebase-config.functions";

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Database | null = null;
let ready: Promise<void> | null = null;

export function firebaseReady(): Promise<void> {
  if (!ready) {
    ready = (async () => {
      const cfg = await getFirebaseConfig();
      app = getApps()[0] ?? initializeApp(cfg);
      auth = getAuth(app);
      db = getDatabase(app);
    })();
  }
  return ready;
}

export function fbAuth(): Auth {
  if (!auth) throw new Error("Firebase not initialized — await firebaseReady() first");
  return auth;
}

export function fbDb(): Database {
  if (!db) throw new Error("Firebase not initialized — await firebaseReady() first");
  return db;
}

/** Current auth instance if already initialized (never triggers init). */
export function fbAuthIfReady(): Auth | null {
  return auth;
}
