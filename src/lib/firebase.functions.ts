import { createServerFn } from "@tanstack/react-start";

// Firebase web config is public-by-design (identifies the project, not a credential).
// The API key itself stays in the secret store and is served to the client from here.
export const getFirebaseConfig = createServerFn({ method: "GET" }).handler(async () => {
  const apiKey = process.env["GOOGLE_API_KEY"];
  if (!apiKey) throw new Error("Firebase API key is not configured");
  return {
    apiKey,
    authDomain: "build-app-bcdab.firebaseapp.com",
    databaseURL: "https://build-app-bcdab-default-rtdb.firebaseio.com",
    projectId: "build-app-bcdab",
    storageBucket: "build-app-bcdab.firebasestorage.app",
    messagingSenderId: "1085484961264",
    appId: "1:1085484961264:web:ed690f3bd6b45079026135",
  };
});
