import "@/lib/server-env";
import { createServerFn } from "@tanstack/react-start";

const BUCKET = "media";

async function admin() {
  const { getAdminClient } = await import("@/lib/admin-client");
  const supabaseAdmin = await getAdminClient();
  return supabaseAdmin;
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

type TemplateRow = {
  id: string;
  name: string;
  description: string;
  category: string;
  base_apk: string;
  html: string;
  image_url: string | null;
  video_url: string | null;
  created_at: string;
};

async function signTemplates(rows: TemplateRow[]) {
  const db = await admin();
  const paths = rows.flatMap((r) => [r.image_url, r.video_url]).filter((p): p is string => !!p);
  const map = new Map<string, string>();
  if (paths.length) {
    const { data } = await db.storage.from(BUCKET).createSignedUrls(paths, 60 * 60 * 24 * 7);
    data?.forEach((d) => d.path && d.signedUrl && map.set(d.path, d.signedUrl));
  }
  return rows.map((r) => ({
    ...r,
    image: r.image_url ? map.get(r.image_url) ?? null : null,
    video: r.video_url ? map.get(r.video_url) ?? null : null,
  }));
}

export type Template = Awaited<ReturnType<typeof signTemplates>>[number];

/* ---------- Public ---------- */

export const listTemplates = createServerFn({ method: "GET" }).handler(async () => {
  const db = await admin();
  const { data, error } = await db.from("templates").select("*").order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return signTemplates(data as TemplateRow[]);
});

export const getTemplate = createServerFn({ method: "GET" })
  .inputValidator((d: { id: string }) => ({ id: str(d?.["id"], "id", 64) }))
  .handler(async ({ data }) => {
    // Relative assets inside template HTML (e.g. my_icon.png) resolve to /templates/<file>; treat non-UUIDs as not found.
    if (!/^[0-9a-f-]{36}$/i.test(data.id)) return null;
    const db = await admin();
    const { data: row, error } = await db.from("templates").select("*").eq("id", data.id).maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) return null;
    return (await signTemplates([row as TemplateRow]))[0];
  });

export const createBuildRequest = createServerFn({ method: "POST" })
  .inputValidator((d: Record<string, unknown>) => {
    const email = str(d?.["requester_email"], "Email", 255);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Invalid email");
    const pkg = str(d?.["package_name"], "Package name", 120);
    if (!/^[a-zA-Z][\w]*(\.[a-zA-Z][\w]*)+$/.test(pkg)) throw new Error("Package name like com.company.app");
    const fbUid = str(d?.["firebase_uid"], "User", 128, false);
    if (fbUid && !/^[A-Za-z0-9_-]{6,128}$/.test(fbUid)) throw new Error("Invalid user");
    return {
      template_id: str(d?.["template_id"], "Template", 64),
      requester_name: str(d?.["requester_name"], "Name", 100),
      requester_email: email,
      app_name: str(d?.["app_name"], "App name", 60),
      package_name: pkg,
      notes: str(d?.["notes"], "Notes", 1000, false),
      firebase_uid: fbUid || null,
      register_link: (() => {
        const u = str(d?.["register_link"], "Register link", 1000);
        if (!/^https?:\/\/\S+$/i.test(u)) throw new Error("Register link must start with http(s)://");
        return u;
      })(),
      logo_path: (() => {
        const l = str(d?.["logo_path"], "Logo", 200, false);
        if (l && !/^logos\/[0-9a-f-]{36}\.[a-z0-9]{1,8}$/i.test(l)) throw new Error("Invalid logo");
        return l || null;
      })(),
    };
  })
  .handler(async ({ data }) => {
    const db = await admin();
    const { data: t } = await db.from("templates").select("name").eq("id", data.template_id).maybeSingle();
    if (!t) throw new Error("Template not found");

    // Wallet: if a build price is set, the user must be logged in and have enough balance.
    const { data: s } = await db.from("settings").select("build_price").eq("id", 1).maybeSingle();
    const price = s?.build_price ?? 0;
    const { firebase_uid, ...fields } = data;
    if (price > 0) {
      if (!firebase_uid) throw new Error("LOGIN_REQUIRED");
      const { data: w } = await db.from("wallets").select("balance").eq("uid", firebase_uid).maybeSingle();
      const balance = w?.balance ?? 0;
      if (balance < price) throw new Error("ADD_BALANCE");
      const { error: dErr } = await db
        .from("wallets")
        .update({ balance: balance - price, updated_at: new Date().toISOString() })
        .eq("uid", firebase_uid);
      if (dErr) throw new Error(dErr.message);
    }

    const { data: row, error } = await db
      .from("build_requests")
      .insert({ ...fields, template_name: t.name })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id, charged: price };
  });

export const createLogoUploadUrl = createServerFn({ method: "POST" })
  .inputValidator((d: { filename: string }) => ({ filename: str(d?.["filename"], "File", 200) }))
  .handler(async ({ data }) => {
    const ext = (data.filename.split(".").pop() || "png").replace(/[^a-z0-9]/gi, "").slice(0, 8).toLowerCase();
    if (!["png", "jpg", "jpeg", "webp"].includes(ext)) throw new Error("Logo must be PNG, JPG or WEBP");
    const path = `logos/${crypto.randomUUID()}.${ext}`;
    const db = await admin();
    const { data: signed, error } = await db.storage.from(BUCKET).createSignedUploadUrl(path);
    if (error) throw new Error(error.message);
    return { path, token: signed.token };
  });

async function signPath(path: string | null | undefined, download?: string) {
  if (!path) return null;
  const db = await admin();
  const { data } = await db.storage.from(BUCKET).createSignedUrl(path, 60 * 60 * 24, download ? { download } : undefined);
  return data?.signedUrl ?? null;
}

function apkName(app: string) {
  return (app.replace(/[^\w\- ]+/g, "").trim().replace(/\s+/g, "_") || "app") + ".apk";
}

export const getRequestStatus = createServerFn({ method: "GET" })
  .inputValidator((d: { id: string }) => ({ id: str(d?.["id"], "Request ID", 64) }))
  .handler(async ({ data }) => {
    if (!/^[0-9a-f-]{36}$/i.test(data.id)) return null;
    const db = await admin();
    const { data: row } = await db
      .from("build_requests")
      .select("id, app_name, template_name, status, apk_path, created_at, updated_at")
      .eq("id", data.id)
      .maybeSingle();
    if (!row) return null;
    const { apk_path, ...rest } = row;
    return { ...rest, download: row.status === "success" ? await signPath(apk_path, apkName(row.app_name)) : null };
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
    const db = await admin();
    const [{ data: reqs }, { count }] = await Promise.all([
      db.from("build_requests").select("*").order("created_at", { ascending: false }),
      db.from("templates").select("id", { count: "exact", head: true }),
    ]);
    const requests = await Promise.all(
      (reqs ?? []).map(async (r) => ({
        ...r,
        download: r.apk_path ? await signPath(r.apk_path, apkName(r.app_name)) : null,
        encrypted_download: r.encrypted_apk_path ? await signPath(r.encrypted_apk_path, "encrypted_" + apkName(r.app_name)) : null,
        logo: await signPath(r.logo_path),
      })),
    );
    return { requests, templateCount: count ?? 0 };
  });

export const adminListTemplates = createServerFn({ method: "POST" })
  .inputValidator((d: { password: string }) => d)
  .handler(async ({ data }) => {
    checkPassword(data?.password);
    const db = await admin();
    const { data: rows } = await db.from("templates").select("*").order("created_at", { ascending: false });
    return signTemplates((rows ?? []) as TemplateRow[]);
  });

export const adminUploadUrl = createServerFn({ method: "POST" })
  .inputValidator((d: { password: string; filename: string; kind: "image" | "video" }) => d)
  .handler(async ({ data }) => {
    checkPassword(data?.password);
    const ext = (data.filename.split(".").pop() || "bin").replace(/[^a-z0-9]/gi, "").slice(0, 8);
    const path = `${data.kind === "video" ? "videos" : "images"}/${crypto.randomUUID()}.${ext}`;
    const db = await admin();
    const { data: signed, error } = await db.storage.from(BUCKET).createSignedUploadUrl(path);
    if (error) throw new Error(error.message);
    return { path, token: signed.token };
  });

export const adminCreateTemplate = createServerFn({ method: "POST" })
  .inputValidator((d: Record<string, unknown>) => ({
    password: d?.["password"] as string,
    name: str(d?.["name"], "Name", 100),
    description: str(d?.["description"], "Description", 1000, false),
    category: "General",
    base_apk: (() => { const b = str(d?.["base_apk"], "APK", 20); if (!["bingo", "ab", "teacher"].includes(b)) throw new Error("Pick an APK"); return b; })(),
    html: str(d?.["html"], "HTML", 500_000),
    image_url: str(d?.["image_url"], "Image", 300, false) || null,
    video_url: str(d?.["video_url"], "Video", 300, false) || null,
  }))
  .handler(async ({ data }) => {
    checkPassword(data.password);
    const { password: _p, ...row } = data;
    const db = await admin();
    const { data: t, error } = await db.from("templates").insert(row).select("id").single();
    if (error) throw new Error(error.message);
    return t;
  });

export const adminDeleteTemplate = createServerFn({ method: "POST" })
  .inputValidator((d: { password: string; id: string }) => d)
  .handler(async ({ data }) => {
    checkPassword(data?.password);
    const db = await admin();
    const { data: t } = await db.from("templates").select("image_url, video_url").eq("id", data.id).maybeSingle();
    const files = [t?.image_url, t?.video_url].filter((x): x is string => !!x);
    if (files.length) await db.storage.from(BUCKET).remove(files);
    const { error } = await db.from("templates").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

type Db = Awaited<ReturnType<typeof admin>>;

async function dispatchBuild(db: Db, req: { id: string; app_name: string; package_name: string; app_id?: string | null }) {
  const token = process.env["GITHUB_FINE_GRAINED_PERSONAL_ACCESS_TOKEN"] || process.env["GITHUB_TOKEN"];
  const secret = process.env["BUILD_CALLBACK_SECRET"];
  let builderUrl = process.env["BUILDER_URL"] || "";
  if (!builderUrl) {
    try {
      const { getRequest } = await import("@tanstack/react-start/server");
      builderUrl = new URL(getRequest().url).origin;
    } catch { /* ignore */ }
  }
  const repo = process.env["GITHUB_REPO"]; // "owner/repo"
  let status = "approved";
  let log = "Approved. GitHub not configured yet — GitHub build settings are missing.";
  let github = false;

  if (token && repo && secret && builderUrl) {
    const res = await fetch(`https://api.github.com/repos/${repo}/dispatches`, {
      method: "POST",
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        "User-Agent": "builder-app",
      },
      body: JSON.stringify({
        event_type: "build-apk",
        client_payload: {
          request_id: req.id,
          app_name: req.app_name,
          package_name: req.package_name,
          app_id: req.app_id ?? null,
          builder_url: builderUrl.replace(/\/$/, ""),
          secret,
        },
      }),
    });
    if (res.ok) {
      status = "building";
      log = "GitHub workflow triggered.";
      github = true;
    } else {
      status = "failed";
      log = `GitHub dispatch failed [${res.status}]: ${(await res.text()).slice(0, 300)}`;
    }
  }

  await db
    .from("build_requests")
    .update({ status, build_log: log, updated_at: new Date().toISOString() })
    .eq("id", req.id);
  return { status, github, log };
}

export const adminDecide = createServerFn({ method: "POST" })
  .inputValidator((d: { password: string; id: string; decision: "approve" | "reject" }) => d)
  .handler(async ({ data }) => {
    checkPassword(data?.password);
    const db = await admin();
    const { data: req } = await db.from("build_requests").select("*").eq("id", data.id).maybeSingle();
    if (!req) throw new Error("Request not found");
    if (req.status !== "pending") throw new Error(`Request is already ${req.status}`);

    if (data.decision === "reject") {
      await db.from("build_requests").update({ status: "rejected", updated_at: new Date().toISOString() }).eq("id", data.id);
      return { status: "rejected", github: false, log: "" };
    }
    return dispatchBuild(db, req);
  });

/* Admin builds an APK directly from a template (no user request needed). */
export const adminBuild = createServerFn({ method: "POST" })
  .inputValidator((d: Record<string, unknown>) => {
    const pkg = str(d?.["package_name"], "Package name", 120);
    if (!/^[a-zA-Z][\w]*(\.[a-zA-Z][\w]*)+$/.test(pkg)) throw new Error("Package name like com.company.app");
    const reg = str(d?.["register_link"], "Register link", 1000, false);
    if (reg && !/^https?:\/\/\S+$/i.test(reg)) throw new Error("Register link must start with http(s)://");
    const logo = str(d?.["logo_path"], "Logo", 200, false);
    if (logo && !/^logos\/[0-9a-f-]{36}\.[a-z0-9]{1,8}$/i.test(logo)) throw new Error("Invalid logo");
    const appId = str(d?.["app_id"], "App ID", 64, false);
    if (appId && !/^[A-Za-z0-9_-]+$/.test(appId)) throw new Error("App ID: letters, digits, _ or - only");
    return {
      password: d?.["password"] as string,
      template_id: str(d?.["template_id"], "Template", 64),
      app_name: str(d?.["app_name"], "App name", 60),
      package_name: pkg,
      register_link: reg,
      logo_path: logo || null,
      app_id: appId || null,
    };
  })
  .handler(async ({ data }) => {
    checkPassword(data.password);
    const { password: _p, ...fields } = data;
    const db = await admin();
    const { data: t } = await db.from("templates").select("name, base_apk").eq("id", fields.template_id).maybeSingle();
    if (!t) throw new Error("Template not found");
    if (t.base_apk === "teacher" && !fields.app_id) throw new Error("App ID is required for Teacher");
    const { data: row, error } = await db
      .from("build_requests")
      .insert({ ...fields, template_name: t.name, requester_name: "Admin", requester_email: "admin@builder.local" })
      .select("id, app_name, package_name, app_id")
      .single();
    if (error) throw new Error(error.message);
    const res = await dispatchBuild(db, row);
    return { id: row.id, ...res };
  });

export const adminBuildStatus = createServerFn({ method: "POST" })
  .inputValidator((d: { password: string; id: string }) => d)
  .handler(async ({ data }) => {
    checkPassword(data?.password);
    const db = await admin();
    const { data: row } = await db
      .from("build_requests")
      .select("id, app_name, status, build_log, apk_path, encrypted_apk_path, encrypt_status, encrypt_log, created_at, updated_at")
      .eq("id", data.id)
      .maybeSingle();
    if (!row) throw new Error("Build not found");
    const { apk_path, encrypted_apk_path, ...rest } = row;
    return {
      ...rest,
      download: row.status === "success" ? await signPath(apk_path, apkName(row.app_name)) : null,
      encrypted_download: encrypted_apk_path ? await signPath(encrypted_apk_path, "encrypted_" + apkName(row.app_name)) : null,
    };
  });

export const BUILD_STATUSES = ["pending", "approved", "building", "success", "failed", "rejected"] as const;

export const adminDeleteRequest = createServerFn({ method: "POST" })
  .inputValidator((d: { password: string; id: string }) => d)
  .handler(async ({ data }) => {
    checkPassword(data?.password);
    if (!/^[0-9a-f-]{36}$/i.test(data.id)) throw new Error("Invalid id");
    const db = await admin();
    const { data: r } = await db.from("build_requests").select("apk_path, logo_path, encrypted_apk_path").eq("id", data.id).maybeSingle();
    const files = [r?.apk_path, r?.logo_path, r?.encrypted_apk_path].filter((x): x is string => !!x);
    if (files.length) await db.storage.from(BUCKET).remove(files);
    const { error } = await db.from("build_requests").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

async function dispatchEncrypt(db: Db, req: { id: string; app_name: string; apk_path: string }) {
  const token = process.env["GITHUB_FINE_GRAINED_PERSONAL_ACCESS_TOKEN"] || process.env["GITHUB_TOKEN"];
  const secret = process.env["BUILD_CALLBACK_SECRET"];
  let builderUrl = process.env["BUILDER_URL"] || "";
  if (!builderUrl) {
    try {
      const { getRequest } = await import("@tanstack/react-start/server");
      builderUrl = new URL(getRequest().url).origin;
    } catch { /* ignore */ }
  }
  const repo = process.env["GITHUB_REPO"];
  const apkUrl = await signPath(req.apk_path);
  let encrypt_status = "idle";
  let encrypt_log = "GitHub not configured yet.";
  let github = false;
  if (token && repo && secret && builderUrl && apkUrl) {
    const res = await fetch(`https://api.github.com/repos/${repo}/dispatches`, {
      method: "POST",
      headers: { Accept: "application/vnd.github+json", Authorization: `Bearer ${token}`, "User-Agent": "builder-app" },
      body: JSON.stringify({
        event_type: "encrypt-apk",
        client_payload: {
          request_id: req.id,
          app_name: req.app_name,
          apk_url: apkUrl,
          builder_url: builderUrl.replace(/\/$/, ""),
          secret,
        },
      }),
    });
    if (res.ok) { encrypt_status = "encrypting"; encrypt_log = "Encryption workflow triggered."; github = true; }
    else { encrypt_status = "encrypt_failed"; encrypt_log = `GitHub dispatch failed [${res.status}]: ${(await res.text()).slice(0, 300)}`; }
  }
  await db.from("build_requests")
    .update({ encrypt_status, encrypt_log, updated_at: new Date().toISOString() })
    .eq("id", req.id);
  return { encrypt_status, github, encrypt_log };
}

export const adminEncrypt = createServerFn({ method: "POST" })
  .inputValidator((d: { password: string; id: string }) => d)
  .handler(async ({ data }) => {
    checkPassword(data?.password);
    if (!/^[0-9a-f-]{36}$/i.test(data.id)) throw new Error("Invalid id");
    const db = await admin();
    const { data: row } = await db.from("build_requests").select("id, app_name, status, apk_path, encrypt_status").eq("id", data.id).maybeSingle();
    if (!row) throw new Error("Build not found");
    if (row.status !== "success" || !row.apk_path) throw new Error("APK not ready");
    if (row.encrypt_status === "encrypting") throw new Error("Already encrypting");
    return dispatchEncrypt(db, { id: row.id, app_name: row.app_name, apk_path: row.apk_path });
  });
