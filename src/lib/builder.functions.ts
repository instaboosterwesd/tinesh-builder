import { createServerFn } from "@tanstack/react-start";
import { requireFirebaseAuth } from "@/integrations/firebase/auth-middleware";
import { apkName, APP_ID_RE, checkPassword, int, LOGO_RE, signPath, str, uuid, walletChange } from "@/lib/server-helpers";
import { BASE_APKS, baseNeedsAppId } from "@/lib/base-apks";
import { validateLogoUpload } from "@/lib/image-upload";
import { randomPackageName } from "@/lib/package-name";

type TemplateRow = {
  id: string; name: string; description: string; category: string; base_apk: string; html: string;
  image_url: string | null; video_url: string | null; price: number; show_preview: boolean; created_at: string;
};

type BuildRow = {
  user_id?: string | null; template_id?: string; template_name: string; requester_name: string; requester_email: string;
  app_name: string; package_name: string; app_id?: string | null; register_link?: string; logo_path?: string | null;
  charged?: number; status: string; build_log?: string; apk_path?: string | null; encrypt_status?: string | null;
  encrypt_log?: string; encrypted_apk_path?: string | null; created_at: string; updated_at: string;
};

async function adb() {
  return import("@/integrations/firebase/admin.server");
}

function keyed<T extends object>(rec: Record<string, T> | null): (T & { id: string })[] {
  return Object.entries(rec ?? {}).map(([id, v]) => ({ ...v, id }));
}

async function signTemplates(rows: TemplateRow[], includeHtml: boolean) {
  return Promise.all(
    rows.map(async (r) => ({
      ...r,
      // Hide HTML from visitors when the admin switched the live preview off.
      html: includeHtml || r.show_preview ? r.html : "",
      image: await signPath(r.image_url),
      video: await signPath(r.video_url),
    })),
  );
}

export type Template = Awaited<ReturnType<typeof signTemplates>>[number];

/* ---------- Public ---------- */

export const listTemplates = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const db = await adb();
    const rec = await db.dbGet<Record<string, Omit<TemplateRow, "id">>>("templates");
    const rows = keyed(rec).sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""));
    return await signTemplates(rows.map((r) => ({ ...r, html: "" })), false);
  } catch (e) {
    // Public home page must still render when the backend key is missing/invalid.
    console.error("listTemplates failed:", e instanceof Error ? e.message : e);
    return [] as Awaited<ReturnType<typeof signTemplates>>;
  }
});

export const getTemplate = createServerFn({ method: "GET" })
  .inputValidator((d: { id: string }) => ({ id: uuid(d?.id) }))
  .handler(async ({ data }) => {
    const db = await adb();
    const row = await db.dbGet<Omit<TemplateRow, "id">>(`templates/${data.id}`);
    if (!row) return null;
    return (await signTemplates([{ ...row, id: data.id }], false))[0];
  });

/* ---------- Signed-in user ---------- */

export const uploadLogo = createServerFn({ method: "POST" })
  .middleware([requireFirebaseAuth])
  .inputValidator(validateLogoUpload)
  .handler(async ({ data, context }) => {
    const { uploadImage } = await import("@/lib/image-upload");
    const url = await uploadImage(data.image);
    const path = `logos/${crypto.randomUUID()}.${data.ext}`;
    const db = await adb();
    await db.dbSet(`mediaFiles/${path.replace(/\./g, "_")}`, { url, user_id: context.userId });
    return { path, url };
  });

export const userBuild = createServerFn({ method: "POST" })
  .middleware([requireFirebaseAuth])
  .inputValidator((d: Record<string, unknown>) => {
    const appId = str(d?.["app_id"], "App ID", 64, false);
    if (appId && !APP_ID_RE.test(appId)) throw new Error("App ID: letters, digits, _ or - only");
    const reg = str(d?.["register_link"], "Register link", 1000, false);
    if (reg && !/^https?:\/\/\S+$/i.test(reg)) throw new Error("Link must start with http(s)://");
    const logo = str(d?.["logo_path"], "Logo", 200);
    if (!LOGO_RE.test(logo)) throw new Error("Invalid logo");
    return { template_id: uuid(d?.["template_id"], "template"), app_name: str(d?.["app_name"], "App name", 60), package_name: randomPackageName(), app_id: appId || null, register_link: reg, logo_path: logo };
  })
  .handler(async ({ data, context }) => {
    const db = await adb();
    const userId = context.userId;
    const t = await db.dbGet<{ name: string; base_apk: string; price: number }>(`templates/${data.template_id}`);
    if (!t) throw new Error("Template not found");
    if (baseNeedsAppId(t.base_apk) && !data.app_id) throw new Error("App ID is required for this template");
    if (!baseNeedsAppId(t.base_apk) && !data.register_link) throw new Error("Register link is required");
    const media = await db.dbGet<{ user_id: string }>(`mediaFiles/${data.logo_path.replace(/\./g, "_")}`);
    if (!media || media.user_id !== userId) throw new Error("Please upload your logo again");
    const profile = await db.dbGet<{ name?: string; email?: string }>(`profiles/${userId}`);

    if (t.price > 0) await walletChange(userId, -t.price, "build", `Build: ${data.app_name} (${t.name})`);

    const id = crypto.randomUUID();
    const row = {
      ...data, id, user_id: userId, template_name: t.name, charged: t.price,
      requester_name: profile?.name || "User", requester_email: profile?.email || "",
      status: "pending", created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    };
    try {
      await db.dbSet(`buildRequests/${id}`, row);
    } catch (e) {
      if (t.price > 0) await walletChange(userId, t.price, "refund", `Refund: ${data.app_name}`);
      throw e;
    }
    const { dispatchBuild } = await import("@/lib/dispatch.server");
    const res = await dispatchBuild(row);
    return { id, charged: t.price, ...res };
  });

export const myBuilds = createServerFn({ method: "GET" })
  .middleware([requireFirebaseAuth])
  .handler(async ({ context }) => {
    const db = await adb();
    const rec = await db.dbGet<Record<string, BuildRow>>("buildRequests");
    const mine = keyed(rec)
      .filter((r) => r.user_id === context.userId)
      .sort((a, b) => String(b["created_at"]).localeCompare(String(a["created_at"])))
      .slice(0, 100);
    return Promise.all(
      mine.map(async (r) => ({
        id: r.id,
        app_name: r.app_name, package_name: r.package_name, template_name: r.template_name,
        status: r.status, charged: r.charged, created_at: r.created_at, updated_at: r.updated_at,
        download: r.status === "success" ? await signPath(r.apk_path as string | null, apkName(String(r.app_name))) : null,
        logo: await signPath(r.logo_path as string | null),
      })),
    );
  });

export const leaderboard = createServerFn({ method: "GET" }).handler(async () => {
  const db = await adb();
  const rec = await db.dbGet<Record<string, { user_id?: string; status?: string }>>("buildRequests");
  const counts = new Map<string, number>();
  Object.values(rec ?? {}).forEach((r) => {
    if (r.user_id && r.status !== "rejected") counts.set(r.user_id, (counts.get(r.user_id) ?? 0) + 1);
  });
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 50);
  if (!top.length) return [];
  const profiles = await db.dbGet<Record<string, { name?: string }>>("profiles");
  // Only the display name is returned — never email, username or IDs.
  return top.map(([id, builds], i) => ({ rank: i + 1, name: profiles?.[id]?.name || "Anonymous", builds }));
});

/* ---------- Admin ---------- */

export const adminLogin = createServerFn({ method: "POST" })
  .inputValidator((d: { password: string }) => d)
  .handler(async ({ data }) => {
    checkPassword(data?.password);
    return { ok: true };
  });

export const adminOverview = createServerFn({ method: "POST" })
  .inputValidator((d: { password: string }) => d)
  .handler(async ({ data }) => {
    checkPassword(data?.password);
    const db = await adb();
    const [reqsRec, tplRec, profRec, depRec] = await Promise.all([
      db.dbGet<Record<string, BuildRow>>("buildRequests"),
      db.dbGet<Record<string, unknown>>("templates"),
      db.dbGet<Record<string, unknown>>("profiles"),
      db.dbGet<Record<string, { status?: string }>>("deposits"),
    ]);
    const all = keyed(reqsRec).sort((a, b) => String(b["created_at"]).localeCompare(String(a["created_at"]))).slice(0, 300);
    const requests = await Promise.all(
      all.map(async (r) => ({
        ...r,
        download: r.apk_path ? await signPath(r.apk_path as string, apkName(String(r.app_name))) : null,
        encrypted_download: r.encrypted_apk_path ? await signPath(r.encrypted_apk_path as string, "encrypted_" + apkName(String(r.app_name))) : null,
        logo: await signPath(r.logo_path as string | null),
      })),
    );
    const revenue = requests.reduce((s, r) => s + (Number(r.charged) || 0), 0);
    const pendingDeposits = Object.values(depRec ?? {}).filter((d) => d.status === "pending").length;
    return {
      requests,
      templateCount: Object.keys(tplRec ?? {}).length,
      userCount: Object.keys(profRec ?? {}).length,
      pendingDeposits,
      revenue,
    };
  });

export const adminListTemplates = createServerFn({ method: "POST" })
  .inputValidator((d: { password: string }) => d)
  .handler(async ({ data }) => {
    checkPassword(data?.password);
    const db = await adb();
    const rec = await db.dbGet<Record<string, Omit<TemplateRow, "id">>>("templates");
    const rows = keyed(rec).sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""));
    return signTemplates(rows, true);
  });

export const adminUploadUrl = createServerFn({ method: "POST" })
  .inputValidator((d: { password: string; filename: string; kind: "image" | "video"; contentType?: string }) => d)
  .handler(async ({ data }) => {
    checkPassword(data?.password);
    const ext = (data.filename.split(".").pop() || "bin").replace(/[^a-z0-9]/gi, "").slice(0, 8);
    const path = `${data.kind === "video" ? "videos" : "images"}/${crypto.randomUUID()}.${ext}`;
    const db = await adb();
    const url = await db.storageCreateUploadUrl(path, data.contentType || "application/octet-stream");
    return { path, url };
  });

function templateFields(d: Record<string, unknown>) {
  const b = str(d?.["base_apk"], "APK", 20);
  if (!BASE_APKS.some((x) => x.id === b)) throw new Error("Pick an APK");
  return {
    name: str(d?.["name"], "Name", 100),
    description: str(d?.["description"], "Description", 1000, false),
    base_apk: b,
    html: str(d?.["html"], "HTML", 500_000),
    price: int(d?.["price"], "price", 0, 1_000_000),
    show_preview: d?.["show_preview"] !== false,
  };
}

export const adminUploadTemplateImage = createServerFn({ method: "POST" })
  .inputValidator((d: { password: string; filename: string; image: string }) => ({ password: d?.password, ...validateLogoUpload(d) }))
  .handler(async ({ data }) => {
    checkPassword(data.password);
    const { uploadImage } = await import("@/lib/image-upload");
    return { url: await uploadImage(data.image) };
  });

export const adminSaveTemplate = createServerFn({ method: "POST" })
  .inputValidator((d: Record<string, unknown>) => ({
    password: d?.["password"] as string,
    id: d?.["id"] ? uuid(d["id"]) : null,
    fields: templateFields(d),
    image_url: str(d?.["image_url"], "Image", 300, false) || null,
    video_url: str(d?.["video_url"], "Video", 300, false) || null,
  }))
  .handler(async ({ data }) => {
    checkPassword(data.password);
    const db = await adb();
    const media = {
      ...(data.image_url ? { image_url: data.image_url } : {}),
      ...(data.video_url ? { video_url: data.video_url } : {}),
    };
    if (data.id) {
      await db.dbUpdate(`templates/${data.id}`, { ...data.fields, ...media });
      return { id: data.id };
    }
    const id = crypto.randomUUID();
    await db.dbSet(`templates/${id}`, { ...data.fields, ...media, category: "", created_at: new Date().toISOString() });
    return { id };
  });

export const adminDeleteTemplate = createServerFn({ method: "POST" })
  .inputValidator((d: { password: string; id: string }) => ({ password: d?.password, id: uuid(d?.id) }))
  .handler(async ({ data }) => {
    checkPassword(data.password);
    const db = await adb();
    const t = await db.dbGet<{ image_url?: string; video_url?: string }>(`templates/${data.id}`);
    const files = [t?.image_url, t?.video_url].filter((x): x is string => !!x && !/^https?:\/\//.test(x));
    if (files.length) await db.storageDelete(files);
    await db.dbRemove(`templates/${data.id}`);
    return { ok: true };
  });

export const adminDecide = createServerFn({ method: "POST" })
  .inputValidator((d: { password: string; id: string; decision: "approve" | "reject" }) => ({ ...d, id: uuid(d?.id) }))
  .handler(async ({ data }) => {
    checkPassword(data.password);
    const db = await adb();
    const req = await db.dbGet<BuildRow>(`buildRequests/${data.id}`);
    if (!req) throw new Error("Request not found");
    if (!["pending", "approved", "failed"].includes(String(req.status))) throw new Error(`Request is already ${req.status}`);
    if (data.decision === "reject") {
      await db.dbUpdate(`buildRequests/${data.id}`, { status: "rejected", updated_at: new Date().toISOString() });
      if (req.user_id && Number(req.charged) > 0) {
        await walletChange(String(req.user_id), Number(req.charged), "refund", `Refund: ${req.app_name}`);
      }
      return { status: "rejected", github: false, log: "" };
    }
    const { dispatchBuild } = await import("@/lib/dispatch.server");
    return dispatchBuild({ ...req, id: data.id });
  });

export const adminBuild = createServerFn({ method: "POST" })
  .inputValidator((d: Record<string, unknown>) => {
    const reg = str(d?.["register_link"], "Register link", 1000, false);
    if (reg && !/^https?:\/\/\S+$/i.test(reg)) throw new Error("Register link must start with http(s)://");
    const logo = str(d?.["logo_path"], "Logo", 200, false);
    if (logo && !LOGO_RE.test(logo)) throw new Error("Invalid logo");
    const appId = str(d?.["app_id"], "App ID", 64, false);
    if (appId && !APP_ID_RE.test(appId)) throw new Error("App ID: letters, digits, _ or - only");
    return {
      password: d?.["password"] as string,
      template_id: uuid(d?.["template_id"], "template"),
      app_name: str(d?.["app_name"], "App name", 60),
      package_name: randomPackageName(), register_link: reg, logo_path: logo || null, app_id: appId || null,
    };
  })
  .handler(async ({ data }) => {
    checkPassword(data.password);
    const { password: _p, ...fields } = data;
    const db = await adb();
    const t = await db.dbGet<{ name: string; base_apk: string }>(`templates/${fields.template_id}`);
    if (!t) throw new Error("Template not found");
    if (baseNeedsAppId(t.base_apk) && !fields.app_id) throw new Error("App ID is required for this template");
    const id = crypto.randomUUID();
    const row = {
      ...fields, id, template_name: t.name, requester_name: "Admin", requester_email: "admin@builder.local",
      status: "pending", created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    };
    await db.dbSet(`buildRequests/${id}`, row);
    const { dispatchBuild } = await import("@/lib/dispatch.server");
    return { id, ...(await dispatchBuild(row)) };
  });

export const adminBuildStatus = createServerFn({ method: "POST" })
  .inputValidator((d: { password: string; id: string }) => ({ password: d?.password, id: uuid(d?.id) }))
  .handler(async ({ data }) => {
    checkPassword(data.password);
    const db = await adb();
    const row = await db.dbGet<BuildRow>(`buildRequests/${data.id}`);
    if (!row) throw new Error("Build not found");
    return {
      id: data.id,
      app_name: row.app_name, status: row.status, build_log: row.build_log,
      encrypt_status: row.encrypt_status, encrypt_log: row.encrypt_log,
      created_at: row.created_at, updated_at: row.updated_at,
      download: row.status === "success" ? await signPath(row.apk_path as string | null, apkName(String(row.app_name))) : null,
      encrypted_download: row.encrypted_apk_path ? await signPath(row.encrypted_apk_path as string, "encrypted_" + apkName(String(row.app_name))) : null,
    };
  });

export const adminDeleteRequest = createServerFn({ method: "POST" })
  .inputValidator((d: { password: string; id: string }) => ({ password: d?.password, id: uuid(d?.id) }))
  .handler(async ({ data }) => {
    checkPassword(data.password);
    const db = await adb();
    const r = await db.dbGet<{ apk_path?: string; logo_path?: string; encrypted_apk_path?: string }>(`buildRequests/${data.id}`);
    const files = [r?.apk_path, r?.logo_path, r?.encrypted_apk_path].filter((x): x is string => !!x);
    if (files.length) await db.storageDelete(files);
    await db.dbRemove(`buildRequests/${data.id}`);
    return { ok: true };
  });

export const adminEncrypt = createServerFn({ method: "POST" })
  .inputValidator((d: { password: string; id: string }) => ({ password: d?.password, id: uuid(d?.id) }))
  .handler(async ({ data }) => {
    checkPassword(data.password);
    const db = await adb();
    const row = await db.dbGet<{ status?: string; apk_path?: string; app_name?: string; encrypt_status?: string }>(`buildRequests/${data.id}`);
    if (!row) throw new Error("Build not found");
    if (row.status !== "success" || !row.apk_path) throw new Error("APK not ready");
    if (row.encrypt_status === "encrypting") throw new Error("Already encrypting");
    const { dispatchEncrypt } = await import("@/lib/dispatch.server");
    return dispatchEncrypt({ id: data.id, app_name: row.app_name ?? "app", apk_path: row.apk_path });
  });
