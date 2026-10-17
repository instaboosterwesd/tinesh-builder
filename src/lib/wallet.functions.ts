import { createServerFn } from "@tanstack/react-start";
import { requireFirebaseAuth } from "@/integrations/firebase/auth-middleware";
import { checkPassword, int, str, walletChange } from "@/lib/server-helpers";
import { siteName, validateSiteIdentity, type SiteIdentity } from "@/lib/site-settings";

async function adb() {
  return import("@/integrations/firebase/admin.server");
}

function keyed<T extends object>(rec: Record<string, T> | null): (T & { id: string })[] {
  return Object.entries(rec ?? {}).map(([id, v]) => ({ ...v, id }));
}

type Settings = SiteIdentity & { upi_id?: string; min_deposit?: number; maintenance_mode?: boolean; maintenance_message?: string; support_link?: string };
type Deposit = { user_id: string; user_email?: string; amount: number; utr: string; status: string; created_at: string; updated_at?: string };
type Tx = { amount: number; kind: string; note: string; created_at: string };

async function readSettings(db: Awaited<ReturnType<typeof adb>>) {
  const data = await db.dbGet<Settings>("settings/main");
  return {
    site_name: siteName(data),
    announcement_enabled: data?.announcement_enabled ?? false,
    announcement_title: data?.announcement_title ?? "",
    announcement_message: data?.announcement_message ?? "",
    upi_id: data?.upi_id ?? "",
    min_deposit: data?.min_deposit ?? 100,
    maintenance_mode: data?.maintenance_mode ?? false,
    maintenance_message: data?.maintenance_message ?? "",
    support_link: data?.support_link ?? "",
  };
}

/* ---------- Public ---------- */

export const getSiteSettings = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const db = await adb();
    const s = await readSettings(db);
    return { site_name: s.site_name, announcement_enabled: s.announcement_enabled, announcement_title: s.announcement_title, announcement_message: s.announcement_message, maintenance_mode: s.maintenance_mode, maintenance_message: s.maintenance_message, support_link: s.support_link };
  } catch (e) {
    // Public site must still render when the backend key is missing/invalid.
    console.error("getSiteSettings failed:", e instanceof Error ? e.message : e);
    return { site_name: siteName(null), announcement_enabled: false, announcement_title: "", announcement_message: "", maintenance_mode: false, maintenance_message: "", support_link: "" };
  }
});

/* ---------- Signed-in user ---------- */

export const getWalletInfo = createServerFn({ method: "GET" })
  .middleware([requireFirebaseAuth])
  .handler(async ({ context }) => {
    const db = await adb();
    const settings = await readSettings(db);
    const [balance, deps, tx] = await Promise.all([
      db.dbGet<number>(`wallets/${context.userId}/balance`),
      db.dbGet<Record<string, Deposit>>("deposits"),
      db.dbGet<Record<string, Tx>>(`walletTransactions/${context.userId}`),
    ]);
    const myDeps = keyed(deps)
      .filter((d) => d.user_id === context.userId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .slice(0, 30);
    const myTx = keyed(tx).sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 30);
    return {
      balance: balance ?? 0,
      upi_id: settings.upi_id,
      min_deposit: settings.min_deposit,
      support_link: settings.support_link,
      deposits: myDeps,
      transactions: myTx,
    };
  });

export const requestDeposit = createServerFn({ method: "POST" })
  .middleware([requireFirebaseAuth])
  .inputValidator((d: Record<string, unknown>) => {
    const utr = str(d?.["utr"], "UTR", 64);
    if (!/^[A-Za-z0-9]{6,64}$/.test(utr)) throw new Error("Enter a valid UTR / transaction ID");
    return { amount: int(d?.["amount"], "amount", 1, 1_000_000), utr };
  })
  .handler(async ({ data, context }) => {
    const db = await adb();
    const settings = await readSettings(db);
    if (data.amount < settings.min_deposit) throw new Error(`Minimum deposit is ₹${settings.min_deposit}`);
    const all = await db.dbGet<Record<string, Deposit>>("deposits");
    if (Object.values(all ?? {}).some((d) => d.utr === data.utr)) throw new Error("This UTR was already submitted");
    const email = (context.claims as { email?: string })?.email ?? "";
    const id = crypto.randomUUID();
    await db.dbSet(`deposits/${id}`, {
      user_id: context.userId, user_email: email, amount: data.amount, utr: data.utr,
      status: "pending", created_at: new Date().toISOString(),
    });
    return { ok: true };
  });

/* ---------- Admin ---------- */

export const adminGetSettings = createServerFn({ method: "POST" })
  .inputValidator((d: { password: string }) => d)
  .handler(async ({ data }) => {
    checkPassword(data?.password);
    return readSettings(await adb());
  });

export const adminSaveSettings = createServerFn({ method: "POST" })
  .inputValidator((d: Record<string, unknown>) => {
    const link = str(d?.["support_link"], "Support link", 500, false);
    if (link && !/^(https?:\/\/|mailto:|tel:)\S+$/i.test(link)) throw new Error("Support link must start with https://, mailto: or tel:");
    return {
      password: d?.["password"] as string,
      ...validateSiteIdentity(d),
      upi_id: str(d?.["upi_id"], "UPI ID", 100, false),
      min_deposit: int(d?.["min_deposit"], "min deposit", 1, 1_000_000),
      maintenance_mode: d?.["maintenance_mode"] === true,
      maintenance_message: str(d?.["maintenance_message"], "Maintenance message", 500, false),
      support_link: link,
    };
  })
  .handler(async ({ data }) => {
    checkPassword(data.password);
    const { password: _p, ...fields } = data;
    const db = await adb();
    await db.dbUpdate("settings/main", { ...fields, updated_at: new Date().toISOString() });
    return { ok: true };
  });

export const adminListDeposits = createServerFn({ method: "POST" })
  .inputValidator((d: { password: string }) => d)
  .handler(async ({ data }) => {
    checkPassword(data?.password);
    const db = await adb();
    const rec = await db.dbGet<Record<string, Deposit>>("deposits");
    return keyed(rec).sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 200);
  });

export const adminDecideDeposit = createServerFn({ method: "POST" })
  .inputValidator((d: { password: string; id: string; decision: "approve" | "reject" }) => ({ ...d, id: str(d?.id, "id", 64) }))
  .handler(async ({ data }) => {
    checkPassword(data.password);
    const db = await adb();
    const dep = await db.dbGet<Deposit>(`deposits/${data.id}`);
    if (!dep || dep.status !== "pending") throw new Error("Deposit not found or already handled");
    const status = data.decision === "approve" ? "approved" : "rejected";
    await db.dbUpdate(`deposits/${data.id}`, { status, updated_at: new Date().toISOString() });
    if (data.decision === "reject") return { status: "rejected" };
    const balance = await walletChange(dep.user_id, dep.amount, "deposit", `Deposit (UTR ${dep.utr})`);
    return { status: "approved", balance };
  });
