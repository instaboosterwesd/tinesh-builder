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

type Settings = { upi_id: string; min_deposit: number; build_price: number };

async function readSettings(db: Awaited<ReturnType<typeof admin>>): Promise<Settings> {
  const { data } = await db.from("settings").select("upi_id, min_deposit, build_price").eq("id", 1).maybeSingle();
  return { upi_id: data?.upi_id ?? "", min_deposit: data?.min_deposit ?? 100, build_price: data?.build_price ?? 0 };
}

/* ---------- User side ---------- */

export const getWalletInfo = createServerFn({ method: "GET" })
  .inputValidator((d: { uid: string }) => ({ uid: uid(d?.["uid"]) }))
  .handler(async ({ data }) => {
    const db = await admin();
    const settings = await readSettings(db);
    const { data: w } = await db.from("wallets").select("balance").eq("uid", data.uid).maybeSingle();
    const { data: deps } = await db
      .from("deposit_requests")
      .select("id, amount, utr, status, created_at")
      .eq("uid", data.uid)
      .order("created_at", { ascending: false })
      .limit(20);
    return { balance: w?.balance ?? 0, settings, deposits: deps ?? [] };
  });

export const requestDeposit = createServerFn({ method: "POST" })
  .inputValidator((d: Record<string, unknown>) => {
    const amount = Number(d?.["amount"]);
    if (!Number.isInteger(amount) || amount < 1 || amount > 1_000_000) throw new Error("Invalid amount");
    return {
      uid: uid(d?.["uid"]),
      email: str(d?.["email"], "Email", 255),
      amount,
      utr: str(d?.["utr"], "UTR / transaction reference", 64),
    };
  })
  .handler(async ({ data }) => {
    const db = await admin();
    const settings = await readSettings(db);
    if (data.amount < settings.min_deposit) {
      throw new Error(`Minimum deposit is ₹${settings.min_deposit}`);
    }
    const { error } = await db.from("deposit_requests").insert({
      uid: data.uid,
      user_email: data.email,
      amount: data.amount,
      utr: data.utr,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ---------- Admin side ---------- */

export const adminGetSettings = createServerFn({ method: "POST" })
  .inputValidator((d: { password: string }) => d)
  .handler(async ({ data }) => {
    checkPassword(data?.password);
    const db = await admin();
    return readSettings(db);
  });

export const adminSaveSettings = createServerFn({ method: "POST" })
  .inputValidator((d: Record<string, unknown>) => {
    const min = Number(d?.["min_deposit"]);
    const price = Number(d?.["build_price"]);
    if (!Number.isInteger(min) || min < 1 || min > 1_000_000) throw new Error("Invalid min deposit");
    if (!Number.isInteger(price) || price < 0 || price > 1_000_000) throw new Error("Invalid build price");
    return {
      password: d?.["password"] as string,
      upi_id: str(d?.["upi_id"], "UPI ID", 100),
      min_deposit: min,
      build_price: price,
    };
  })
  .handler(async ({ data }) => {
    checkPassword(data.password);
    const { password: _p, ...fields } = data;
    const db = await admin();
    const { error } = await db
      .from("settings")
      .upsert({ id: 1, ...fields, updated_at: new Date().toISOString() });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminListDeposits = createServerFn({ method: "POST" })
  .inputValidator((d: { password: string }) => d)
  .handler(async ({ data }) => {
    checkPassword(data?.password);
    const db = await admin();
    const { data: rows } = await db
      .from("deposit_requests")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    return rows ?? [];
  });

export const adminDecideDeposit = createServerFn({ method: "POST" })
  .inputValidator((d: { password: string; id: string; decision: "approve" | "reject" }) => d)
  .handler(async ({ data }) => {
    checkPassword(data?.password);
    if (!/^[0-9a-f-]{36}$/i.test(data.id)) throw new Error("Invalid id");
    const db = await admin();
    const { data: dep } = await db.from("deposit_requests").select("*").eq("id", data.id).maybeSingle();
    if (!dep) throw new Error("Deposit not found");
    if (dep.status !== "pending") throw new Error(`Already ${dep.status}`);

    if (data.decision === "reject") {
      await db.from("deposit_requests").update({ status: "rejected", updated_at: new Date().toISOString() }).eq("id", data.id);
      return { status: "rejected" };
    }

    // Approve: credit the wallet, then mark approved
    const { data: w } = await db.from("wallets").select("balance").eq("uid", dep.uid).maybeSingle();
    const balance = (w?.balance ?? 0) + dep.amount;
    const { error: wErr } = await db.from("wallets").upsert({
      uid: dep.uid,
      email: dep.user_email,
      balance,
      updated_at: new Date().toISOString(),
    });
    if (wErr) throw new Error(wErr.message);
    await db.from("deposit_requests").update({ status: "approved", updated_at: new Date().toISOString() }).eq("id", data.id);
    return { status: "approved", balance };
  });
