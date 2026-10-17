import "@/lib/server-env";
import { createServerFn } from "@tanstack/react-start";

async function admin() {
  const { getAdminClient } = await import("@/lib/admin-client");
  return getAdminClient();
}

function checkPassword(password: unknown) {
  const expected = process.env["ADMIN_PASSWORD"] || "devdev";
  if (typeof password !== "string" || password !== expected) {
    throw new Error("Unauthorized: wrong admin password");
  }
}

function str(v: unknown, field: string, max = 500, required = true): string {
  const s = typeof v === "string" ? v.trim() : "";
  if (required && !s) throw new Error(`${field} is required`);
  if (s.length > max) throw new Error(`${field} is too long`);
  return s;
}

function uid(v: unknown): string {
  const s = str(v, "User", 128);
  if (!/^[A-Za-z0-9_-]{6,128}$/.test(s)) throw new Error("Invalid user");
  return s;
}

/** Called right after signup/login to keep the user directory in sync. */
export const registerUser = createServerFn({ method: "POST" })
  .inputValidator((d: Record<string, unknown>) => ({
    uid: uid(d?.["uid"]),
    email: str(d?.["email"], "Email", 255),
    name: str(d?.["name"], "Name", 120, false),
    telegram_id: str(d?.["telegram_id"], "Telegram ID", 64, false),
  }))
  .handler(async ({ data }) => {
    const db = await admin();
    // Don't wipe an existing telegram username with an empty login sync
    const { data: existing } = await db.from("app_users").select("name, telegram_id").eq("uid", data.uid).maybeSingle();
    const { error } = await db.from("app_users").upsert({
      uid: data.uid,
      email: data.email,
      name: data.name || existing?.name || "",
      telegram_id: data.telegram_id || existing?.telegram_id || "",
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminListUsers = createServerFn({ method: "POST" })
  .inputValidator((d: { password: string }) => d)
  .handler(async ({ data }) => {
    checkPassword(data?.password);
    const db = await admin();
    const { data: users, error } = await db
      .from("app_users")
      .select("uid, email, name, telegram_id, created_at")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);
    const { data: wallets } = await db.from("wallets").select("uid, balance");
    const balanceByUid = new Map((wallets ?? []).map((w) => [w.uid, w.balance]));
    return (users ?? []).map((u) => ({ ...u, balance: balanceByUid.get(u.uid) ?? 0 }));
  });
