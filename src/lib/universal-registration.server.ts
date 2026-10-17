import { REGISTRATION_DB, registrationId, registrationRecord } from "@/lib/universal-registration";
import { importPKCS8, SignJWT } from "jose";

let cachedToken: { token: string; expires: number } | undefined;
async function registrationAccessToken() {
  const raw = process.env["UNIVERSAL_FIREBASE_SERVICE_ACCOUNT"];
  if (!raw) {
    // This separate database permits access through its existing public rules.
    // Never send the unrelated app database's service-account token here.
    return undefined;
  }
  if (cachedToken && cachedToken.expires > Date.now() + 60_000) return cachedToken.token;
  let account: { private_key: string; client_email: string };
  try {
    account = JSON.parse(raw);
    if (!account.private_key || !account.client_email) throw new Error();
  } catch { throw new Error("Universal Firebase service account is not configured correctly"); }
  const key = await importPKCS8(account.private_key, "RS256");
  const assertion = await new SignJWT({ scope: "https://www.googleapis.com/auth/firebase.database https://www.googleapis.com/auth/userinfo.email" })
    .setProtectedHeader({ alg: "RS256" }).setIssuer(account.client_email)
    .setAudience("https://oauth2.googleapis.com/token").setIssuedAt().setExpirationTime("1h").sign(key);
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST", body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }), signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`Universal Firebase authentication failed [${response.status}]`);
  const result = await response.json() as { access_token?: string; expires_in?: number };
  if (!result.access_token) throw new Error("Universal Firebase authentication failed");
  cachedToken = { token: result.access_token, expires: Date.now() + (result.expires_in ?? 3600) * 1000 };
  return result.access_token;
}

async function request(path: string, init?: RequestInit) {
  const token = await registrationAccessToken();
  const response = await fetch(`${REGISTRATION_DB}/${path}.json`, {
    ...init, headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), "Content-Type": "application/json", ...init?.headers },
    signal: AbortSignal.timeout(15_000),
  });
  if ([401, 403].includes(response.status)) throw new Error("Universal registration access was denied. Check Firebase rules or configure an authorized Universal service account.");
  if (!response.ok && response.status !== 412) throw new Error(`Universal registration database request failed [${response.status}]. Please try again.`);
  return response;
}

export async function createUniversalRegistration(input: Parameters<typeof registrationRecord>[0]) {
  const record = registrationRecord(input);
  for (let attempt = 0; attempt < 10; attempt++) {
    const id = registrationId();
    const [app, bin] = await Promise.all([
      request(`apps/${id}`, { headers: { "X-Firebase-ETag": "true" } }), request(`bin/${id}`),
    ]);
    if (await app.json() || await bin.json()) continue;
    const etag = app.headers.get("etag");
    if (!etag) throw new Error("Universal registration could not reserve an ID. Please try again.");
    const saved = await request(`apps/${id}`, { method: "PUT", headers: { "if-match": etag }, body: JSON.stringify(record) });
    if (saved.status === 412) continue;
    return { id, record };
  }
  throw new Error("Could not generate an unused App ID. Please try again.");
}

export async function removeUniversalRegistration(id: string) {
  if (!/^[a-z2-9]{8}$/.test(id)) throw new Error("Invalid registration ID");
  await request(`apps/${id}`, { method: "DELETE" });
}