// Firebase Admin via REST — workerd-safe (Web Crypto only, no firebase-admin
// Node SDK). Handles: service-account OAuth, Realtime Database reads/writes,
// ID-token verification, and Cloud Storage uploads + signed download URLs.
import { createRemoteJWKSet, jwtVerify } from "jose";

const DB_URL = "https://tineshfirebase-default-rtdb.firebaseio.com";
const BUCKET = "tineshfirebase.firebasestorage.app";
const PROJECT_ID = "tineshfirebase";

type ServiceAccount = { client_email: string; private_key: string; token_uri?: string };

function serviceAccount(): ServiceAccount {
  const raw = process.env["FIREBASE_SERVICE_ACCOUNT"];
  if (!raw) throw new Error("FIREBASE_SERVICE_ACCOUNT not configured");
  try {
    const parsed = JSON.parse(raw) as ServiceAccount;
    if (!parsed?.client_email || !parsed?.private_key) throw new Error("missing fields");
    return parsed;
  } catch {
    throw new Error("FIREBASE_SERVICE_ACCOUNT is not a valid service-account JSON key");
  }
}

/* ---------- base64url / PEM helpers ---------- */

function b64url(data: ArrayBuffer | Uint8Array | string): string {
  let bytes: Uint8Array;
  if (typeof data === "string") bytes = new TextEncoder().encode(data);
  else bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function pemToBuf(pem: string): ArrayBuffer {
  const b64 = pem.replace(/-----[^-]+-----/g, "").replace(/\s+/g, "");
  const bin = atob(b64);
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  return buf.buffer;
}

async function importKey(pem: string) {
  return crypto.subtle.importKey("pkcs8", pemToBuf(pem), { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
}

/* ---------- service-account access token ---------- */

let cachedToken: { token: string; exp: number } | null = null;

export async function adminAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.exp > Date.now() + 60_000) return cachedToken.token;
  const sa = serviceAccount();
  const now = Math.floor(Date.now() / 1000);
  const jwt =
    `${b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }))}.` +
    b64url(
      JSON.stringify({
        iss: sa.client_email,
        scope: "https://www.googleapis.com/auth/firebase.database https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/devstorage.full_control https://www.googleapis.com/auth/identitytoolkit",
        aud: sa.token_uri ?? "https://oauth2.googleapis.com/token",
        iat: now,
        exp: now + 3600,
      }),
    );
  const key = await importKey(sa.private_key);
  const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(jwt));
  const assertion = `${jwt}.${b64url(sig)}`;
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=${encodeURIComponent("urn:ietf:params:oauth:grant-type:jwt-bearer")}&assertion=${assertion}`,
  });
  const json = (await res.json()) as { access_token?: string; expires_in?: number; error_description?: string };
  if (!json.access_token) throw new Error(`Firebase auth failed: ${json.error_description ?? res.status}`);
  cachedToken = { token: json.access_token, exp: Date.now() + (json.expires_in ?? 3600) * 1000 };
  return cachedToken.token;
}

/* ---------- Realtime Database REST ---------- */

async function dbFetch(path: string, init?: RequestInit): Promise<Response> {
  const token = await adminAccessToken();
  const res = await fetch(`${DB_URL}/${path}.json?access_token=${encodeURIComponent(token)}`, init);
  if (!res.ok) throw new Error(`Firebase DB ${init?.method ?? "GET"} ${path} failed [${res.status}]: ${(await res.text()).slice(0, 300)}`);
  return res;
}

export async function dbGet<T>(path: string): Promise<T | null> {
  return (await (await dbFetch(path)).json()) as T | null;
}

export async function dbSet(path: string, value: unknown): Promise<void> {
  await dbFetch(path, { method: "PUT", body: JSON.stringify(value) });
}

export async function dbUpdate(path: string, patch: Record<string, unknown>): Promise<void> {
  await dbFetch(path, { method: "PATCH", body: JSON.stringify(patch) });
}

export async function dbPush(path: string, value: unknown): Promise<string> {
  const res = await dbFetch(path, { method: "POST", body: JSON.stringify(value) });
  const json = (await res.json()) as { name: string };
  return json.name;
}

export async function dbRemove(path: string): Promise<void> {
  await dbFetch(path, { method: "DELETE" });
}

/** Atomic increment/decrement of a numeric field via a REST transaction loop. */
export async function dbTransactNumber(path: string, delta: number): Promise<number> {
  const token = await adminAccessToken();
  const url = `${DB_URL}/${path}.json?access_token=${encodeURIComponent(token)}`;
  for (let attempt = 0; attempt < 5; attempt++) {
    const getRes = await fetch(url, { headers: { "X-Firebase-ETag": "true" } });
    const etag = getRes.headers.get("ETag")?.replace(/^"|"$/g, "") ?? "";
    const current = ((await getRes.json()) as number | null) ?? 0;
    const next = current + delta;
    const putRes = await fetch(url, { method: "PUT", headers: { "if-match": etag }, body: JSON.stringify(next) });
    if (putRes.ok) return next;
    if (putRes.status !== 412) throw new Error(`Firebase transaction failed [${putRes.status}]`);
  }
  throw new Error("Firebase transaction contention");
}

/* ---------- ID-token verification (client user auth) ---------- */

let signingKeys: ReturnType<typeof createRemoteJWKSet> | undefined;

export type VerifiedUser = { uid: string; email: string | null; name: string | null };

export async function verifyIdToken(idToken: string): Promise<VerifiedUser> {
  signingKeys ??= createRemoteJWKSet(new URL("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"));
  const { payload } = await jwtVerify(idToken, signingKeys, {
    algorithms: ["RS256"],
    audience: PROJECT_ID,
    issuer: `https://securetoken.google.com/${PROJECT_ID}`,
    requiredClaims: ["sub", "exp", "iat", "auth_time"],
  });
  if (!payload.sub || payload.sub.length > 128 || !/^[A-Za-z0-9_-]+$/.test(payload.sub)) throw new Error("Invalid user ID");
  const now = Math.floor(Date.now() / 1000);
  if (typeof payload.iat !== "number" || payload.iat > now || typeof payload["auth_time"] !== "number" || payload["auth_time"] > now) throw new Error("Invalid token time");
  return {
    uid: payload.sub,
    email: typeof payload["email"] === "string" ? payload["email"] : null,
    name: typeof payload["name"] === "string" ? payload["name"] : null,
  };
}

/* ---------- Cloud Storage (upload + signed download URLs) ---------- */

export async function storageUpload(path: string, bytes: Uint8Array, contentType: string): Promise<void> {
  const token = await adminAccessToken();
  const res = await fetch(
    `https://storage.googleapis.com/upload/storage/v1/b/${BUCKET}/o?uploadType=media&name=${encodeURIComponent(path)}`,
    { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": contentType }, body: bytes as unknown as BodyInit },
  );
  if (!res.ok) throw new Error(`Storage upload failed [${res.status}]: ${(await res.text()).slice(0, 300)}`);
}

export async function storageDelete(paths: string[]): Promise<void> {
  const token = await adminAccessToken();
  await Promise.all(
    paths.map((p) =>
      fetch(`https://storage.googleapis.com/storage/v1/b/${BUCKET}/o/${encodeURIComponent(p)}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {}),
    ),
  );
}

function hex(buf: ArrayBuffer): string {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** V4-signed GET URL, valid `expiresSec` (max 7 days). */
export async function storageSignUrl(path: string, expiresSec = 60 * 60 * 24, downloadName?: string): Promise<string> {
  const sa = serviceAccount();
  const now = new Date();
  const stamp = now.toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");
  const date = stamp.slice(0, 8);
  const cred = `${sa.client_email}/${date}/auto/storage/goog4_request`;
  const query = new URLSearchParams({
    "X-Goog-Algorithm": "GOOG4-RSA-SHA256",
    "X-Goog-Credential": cred,
    "X-Goog-Date": stamp,
    "X-Goog-Expires": String(Math.min(expiresSec, 604800)),
    "X-Goog-SignedHeaders": "host",
    ...(downloadName ? { "response-content-disposition": `attachment; filename="${downloadName.replace(/"/g, "")}"` } : {}),
  });
  const canonical = `GET\n/${BUCKET}/${path.split("/").map(encodeURIComponent).join("/")}\n${query.toString()}\nhost:storage.googleapis.com\n\nhost\nUNSIGNED-PAYLOAD`;
  const hashed = hex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(canonical)));
  const toSign = `GOOG4-RSA-SHA256\n${stamp}\n${date}/auto/storage/goog4_request\n${hashed}`;
  const key = await importKey(sa.private_key);
  const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(toSign));
  return `https://storage.googleapis.com/${BUCKET}/${path.split("/").map(encodeURIComponent).join("/")}?${query}&X-Goog-Signature=${hex(sig)}`;
}

/** Signed resumable-upload initiation: returns an upload URL the client PUTs bytes to. */
export async function storageCreateUploadUrl(path: string, contentType: string): Promise<string> {
  const token = await adminAccessToken();
  const res = await fetch(
    `https://storage.googleapis.com/upload/storage/v1/b/${BUCKET}/o?uploadType=resumable&name=${encodeURIComponent(path)}`,
    { method: "POST", headers: { Authorization: `Bearer ${token}`, "X-Upload-Content-Type": contentType } },
  );
  if (!res.ok) throw new Error(`Upload URL failed [${res.status}]`);
  const url = res.headers.get("Location");
  if (!url) throw new Error("No upload URL returned");
  return url;
}
