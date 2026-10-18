// Shared validation + Firebase helpers for server functions. No server-only
// imports at module top level: this file is pulled into the client graph by
// *.functions.ts.

export function checkPassword(password: unknown) {
  const expected = process.env["ADMIN_PASSWORD"] || "devdev";
  if (typeof password !== "string" || password !== expected) {
    throw new Error("Unauthorized: wrong admin password");
  }
}

export function str(v: unknown, field: string, max = 500, required = true): string {
  const s = typeof v === "string" ? v.trim() : "";
  if (required && !s) throw new Error(`${field} is required`);
  if (s.length > max) throw new Error(`${field} is too long`);
  return s;
}

export function int(v: unknown, field: string, min: number, max: number): number {
  const n = Number(v);
  if (!Number.isInteger(n) || n < min || n > max) throw new Error(`Invalid ${field}`);
  return n;
}

export function uuid(v: unknown, field = "id"): string {
  const s = typeof v === "string" ? v : "";
  if (!/^[\w-]{6,64}$/.test(s)) throw new Error(`Invalid ${field}`);
  return s;
}

export const PACKAGE_RE = /^[a-zA-Z][\w]*(\.[a-zA-Z][\w]*)+$/;
export const APP_ID_RE = /^[A-Za-z0-9_-]+$/;
export const LOGO_RE = /^logos\/[0-9a-f-]{36}\.[a-z0-9]{1,8}$/i;

export function apkName(app: string) {
  return (app.replace(/[^\w\- ]+/g, "").trim().replace(/\s+/g, "_") || "app") + ".apk";
}

/** APKs stored as GitHub release assets in the build repo: release/<tag>/<file>.apk */
export const RELEASE_RE = /^release\/[\w-]{1,80}\/[\w-]{1,80}\.apk$/;

export async function hmacHex(message: string): Promise<string> {
  const secret = process.env["BUILD_CALLBACK_SECRET"] || "";
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function siteOrigin(): Promise<string> {
  let url = process.env["BUILDER_URL"] || "";
  if (!url) {
    try {
      const { getRequest } = await import("@tanstack/react-start/server");
      url = new URL(getRequest().url).origin;
    } catch {
      /* ignore */
    }
  }
  return url.replace(/\/$/, "");
}

/** Signed download URL for a storage path (null-safe). */
export async function signPath(path: string | null | undefined, download?: string): Promise<string | null> {
  if (!path) return null;
  if (/^https:\/\//.test(path)) return path;
  if (RELEASE_RE.test(path)) {
    const e = String(Math.floor(Date.now() / 1000) + 60 * 60 * 24);
    const n = download ?? "";
    const s = await hmacHex(`${path}|${e}|${n}`);
    const q = new URLSearchParams({ p: path, e, n, s });
    return `${await siteOrigin()}/api/public/apk?${q}`;
  }
  const { storageSignUrl, dbGet } = await import("@/integrations/firebase/admin.server");
  if (LOGO_RE.test(path)) {
    const media = await dbGet<{ url: string }>(`mediaFiles/${path.replace(/\./g, "_")}`);
    if (media?.url && /^https:\/\/i\.ibb\.co\//.test(media.url)) return media.url;
  }
  return storageSignUrl(path, 60 * 60 * 24, download);
}

/** Atomically add (positive) or remove (negative) wallet balance. Throws INSUFFICIENT_BALANCE. */
export async function walletChange(userId: string, amount: number, kind: string, note: string): Promise<number> {
  const { dbGet, dbPush, dbTransactNumber } = await import("@/integrations/firebase/admin.server");
  const current = (await dbGet<number>(`wallets/${userId}/balance`)) ?? 0;
  if (current + amount < 0) throw new Error("INSUFFICIENT_BALANCE");
  const next = await dbTransactNumber(`wallets/${userId}/balance`, amount);
  if (next < 0) {
    await dbTransactNumber(`wallets/${userId}/balance`, -amount);
    throw new Error("INSUFFICIENT_BALANCE");
  }
  await dbPush(`walletTransactions/${userId}`, { amount, kind, note, created_at: new Date().toISOString() });
  return next;
}
