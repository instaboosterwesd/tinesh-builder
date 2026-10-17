import { createServerFn } from "@tanstack/react-start";
import { requireFirebaseAuth } from "@/integrations/firebase/auth-middleware";
import { checkPassword, int, str, uuid, walletChange } from "@/lib/server-helpers";
import { validateProfileDetails } from "@/lib/profile-completion";

async function adb() {
  return import("@/integrations/firebase/admin.server");
}

function keyed<T extends object>(rec: Record<string, T> | null): (T & { id: string })[] {
  return Object.entries(rec ?? {}).map(([id, v]) => ({ ...v, id }));
}

type Profile = { name?: string; email?: string; telegram_id?: string; avatar_url?: string; created_at?: string };
type Tx = { amount: number; kind: string; note: string; created_at: string };
type Login = { user_agent: string; created_at: string };
type BuildLite = { user_id?: string; app_name?: string; template_name?: string; status?: string; charged?: number; created_at?: string };

/* ---------- Signed-in user ---------- */

export const getProfileCompletion = createServerFn({ method: "GET" })
  .middleware([requireFirebaseAuth])
  .handler(async ({ context }) => {
    const db = await adb();
    const path = `profiles/${context.userId}`;
    const profile = await db.dbGet<Profile>(path);
    const defaults = {
      ...(!profile?.email && context.claims.email ? { email: context.claims.email } : {}),
      ...(!profile?.created_at ? { created_at: new Date().toISOString() } : {}),
    };
    if (Object.keys(defaults).length) await db.dbUpdate(path, defaults);
    return { ...profile, ...defaults };
  });

export const getMyProfile = createServerFn({ method: "GET" })
  .middleware([requireFirebaseAuth])
  .handler(async ({ context }) => {
    const db = await adb();
    const uid = context.userId;
    const [p, logins, balance, builds] = await Promise.all([
      db.dbGet<Profile>(`profiles/${uid}`),
      db.dbGet<Record<string, Login>>(`loginHistory/${uid}`),
      db.dbGet<number>(`wallets/${uid}/balance`),
      db.dbGet<Record<string, BuildLite>>("buildRequests"),
    ]);
    const myLogins = keyed(logins).sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 20);
    const myBuilds = Object.values(builds ?? {}).filter((b) => b.user_id === uid).length;
    return { profile: p ?? null, logins: myLogins, balance: balance ?? 0, builds: myBuilds };
  });

export const updateMyProfile = createServerFn({ method: "POST" })
  .middleware([requireFirebaseAuth])
  .inputValidator((d: Record<string, unknown>) => validateProfileDetails(d))
  .handler(async ({ data, context }) => {
    const db = await adb();
    const path = `profiles/${context.userId}`;
    const existing = await db.dbGet<Profile>(path);
    await db.dbUpdate(path, {
      ...data,
      ...(context.claims.email ? { email: context.claims.email } : {}),
      ...(!existing?.created_at ? { created_at: new Date().toISOString() } : {}),
    });
    return { ok: true };
  });

export const recordLogin = createServerFn({ method: "POST" })
  .middleware([requireFirebaseAuth])
  .inputValidator((d: { user_agent?: string }) => ({ user_agent: str(d?.user_agent, "UA", 400, false) }))
  .handler(async ({ data, context }) => {
    const db = await adb();
    await db.dbPush(`loginHistory/${context.userId}`, { user_agent: data.user_agent, created_at: new Date().toISOString() });
    return { ok: true };
  });

export const uploadAvatar = createServerFn({ method: "POST" })
  .middleware([requireFirebaseAuth])
  .inputValidator((d: { image?: string }) => {
    const image = String(d?.image ?? "").replace(/^data:image\/[a-z+]+;base64,/, "");
    if (!image || image.length > 4_500_000 || !/^[A-Za-z0-9+/=]+$/.test(image)) throw new Error("Image must be under 3 MB");
    return { image };
  })
  .handler(async ({ data, context }) => {
    const { uploadImage } = await import("@/lib/image-upload");
    const url = await uploadImage(data.image);
    const db = await adb();
    await db.dbUpdate(`profiles/${context.userId}`, { avatar_url: url });
    return { url };
  });

/* ---------- Admin ---------- */

export const adminListUsers = createServerFn({ method: "POST" })
  .inputValidator((d: { password: string }) => d)
  .handler(async ({ data }) => {
    checkPassword(data?.password);
    const db = await adb();
    const [users, wallets, builds] = await Promise.all([
      db.dbGet<Record<string, Profile>>("profiles"),
      db.dbGet<Record<string, { balance: number }>>("wallets"),
      db.dbGet<Record<string, BuildLite>>("buildRequests"),
    ]);
    const cnt = new Map<string, number>();
    Object.values(builds ?? {}).forEach((b) => b.user_id && cnt.set(b.user_id, (cnt.get(b.user_id) ?? 0) + 1));
    return keyed(users)
      .sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""))
      .slice(0, 1000)
      .map((u) => ({ ...u, balance: wallets?.[u.id]?.balance ?? 0, builds: cnt.get(u.id) ?? 0 }));
  });

export const adminUpdateUser = createServerFn({ method: "POST" })
  .inputValidator((d: Record<string, unknown>) => ({
    password: d?.["password"] as string,
    id: str(d?.["id"], "user", 128),
    name: str(d?.["name"], "Name", 80),
    telegram_id: str(d?.["telegram_id"], "Telegram", 64, false).replace(/^@/, ""),
  }))
  .handler(async ({ data }) => {
    checkPassword(data.password);
    const db = await adb();
    await db.dbUpdate(`profiles/${data.id}`, { name: data.name, telegram_id: data.telegram_id });
    return { ok: true };
  });

export const adminAdjustBalance = createServerFn({ method: "POST" })
  .inputValidator((d: Record<string, unknown>) => ({
    password: d?.["password"] as string,
    id: str(d?.["id"], "user", 128),
    amount: int(d?.["amount"], "amount", -1_000_000, 1_000_000),
    note: str(d?.["note"], "Note", 200, false),
  }))
  .handler(async ({ data }) => {
    checkPassword(data.password);
    if (data.amount === 0) throw new Error("Amount can't be 0");
    try {
      const balance = await walletChange(data.id, data.amount, "admin", data.note || (data.amount > 0 ? "Added by admin" : "Deducted by admin"));
      return { balance };
    } catch (e) {
      if ((e as Error).message === "INSUFFICIENT_BALANCE") throw new Error("User doesn't have that much balance");
      throw e;
    }
  });

export const adminDeleteUser = createServerFn({ method: "POST" })
  .inputValidator((d: { password: string; id: string }) => ({ password: d?.password, id: str(d?.id, "user", 128) }))
  .handler(async ({ data }) => {
    checkPassword(data.password);
    const db = await adb();
    await Promise.all([
      db.dbRemove(`wallets/${data.id}`),
      db.dbRemove(`walletTransactions/${data.id}`),
      db.dbRemove(`loginHistory/${data.id}`),
      db.dbRemove(`profiles/${data.id}`),
    ]);
    // Remove the Firebase Auth account too.
    const token = await db.adminAccessToken();
    await fetch("https://identitytoolkit.googleapis.com/v1/projects/tineshfirebase/accounts:delete", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ localId: data.id }),
    }).catch(() => {});
    return { ok: true };
  });

export const adminUserDetail = createServerFn({ method: "POST" })
  .inputValidator((d: { password: string; id: string }) => ({ password: d?.password, id: str(d?.id, "user", 128) }))
  .handler(async ({ data }) => {
    checkPassword(data.password);
    const db = await adb();
    const [tx, logins, builds] = await Promise.all([
      db.dbGet<Record<string, Tx>>(`walletTransactions/${data.id}`),
      db.dbGet<Record<string, Login>>(`loginHistory/${data.id}`),
      db.dbGet<Record<string, BuildLite>>("buildRequests"),
    ]);
    return {
      transactions: keyed(tx).sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 50),
      logins: keyed(logins).sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 20),
      builds: keyed(builds)
        .filter((b) => b.user_id === data.id)
        .sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""))
        .slice(0, 50),
    };
  });
