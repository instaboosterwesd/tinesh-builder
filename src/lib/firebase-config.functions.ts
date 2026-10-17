import { createServerFn } from "@tanstack/react-start";

// The Firebase web apiKey is public-by-design (it ships in every Firebase web
// app); it is stored as a secret only to keep it out of the repo.
export const getFirebaseConfig = createServerFn({ method: "GET" }).handler(async () => {
  const apiKey = process.env["GOOGLE_API_KEY"];
  if (!apiKey) throw new Error("Firebase API key not configured");
  return {
    apiKey,
    authDomain: "tineshfirebase.firebaseapp.com",
    databaseURL: "https://tineshfirebase-default-rtdb.firebaseio.com",
    projectId: "tineshfirebase",
    storageBucket: "tineshfirebase.firebasestorage.app",
    messagingSenderId: "90636883265",
    appId: "1:90636883265:web:8b339b6b92e36a5819fdc0",
  };
});
