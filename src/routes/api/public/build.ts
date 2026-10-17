
import { createFileRoute } from "@tanstack/react-router";
import { signPath, RELEASE_RE } from "@/lib/server-helpers";

// Called by the GitHub Actions workflows (build + encrypt).
// GET  ?id=<request_id>  -> returns template HTML + app info for the build
// POST { id, status, apk_path?, log? }                -> updates build status
// POST { action: "upload-url", id }                   -> signed upload URL for built APK
// POST { action: "encrypt-upload-url", id }           -> signed upload URL for encrypted APK
// POST { action: "encrypt-status", id, status, encrypted_apk_path?, log? } -> updates encrypt status
// All require header: x-build-secret: <BUILD_CALLBACK_SECRET>
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

function authorized(request: Request) {
  const secret = process.env["BUILD_CALLBACK_SECRET"];
  return !!secret && request.headers.get("x-build-secret") === secret;
}

const isUuid = (s: unknown): s is string => typeof s === "string" && /^[\w-]{6,64}$/.test(s);

export const Route = createFileRoute("/api/public/build")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (!authorized(request)) return json({ error: "Unauthorized" }, 401);
        const id = new URL(request.url).searchParams.get("id") ?? "";
        if (!isUuid(id)) return json({ error: "Bad id" }, 400);
        const db = await import("@/integrations/firebase/admin.server");
        const req = await db.dbGet<Record<string, string | null>>(`buildRequests/${id}`);
        if (!req) return json({ error: "Not found" }, 404);
        const t = req["template_id"] ? await db.dbGet<{ base_apk?: string; html?: string }>(`templates/${req["template_id"]}`) : null;
        const logo_url = await signPath(req["logo_path"]);
        return json({ app_name: req["app_name"], package_name: req["package_name"], register_link: req["register_link"], logo_url, base_apk: t?.base_apk ?? "bingo", html: t?.html ?? "", app_id: req["app_id"] ?? null });
      },
      POST: async ({ request }) => {
        if (!authorized(request)) return json({ error: "Unauthorized" }, 401);
        const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
        const db = await import("@/integrations/firebase/admin.server");
        const action = body["action"];
        const id = body["id"];
        if (!isUuid(id)) return json({ error: "Bad id" }, 400);
        const now = new Date().toISOString();
        try {
          if (action === "upload-url" || action === "encrypt-upload-url") {
            const path = `${action === "upload-url" ? "apks" : "encrypted-apks"}/${id}-${Date.now()}.apk`;
            return json({ path, url: await db.storageCreateUploadUrl(path, "application/vnd.android.package-archive") });
          }
          const log = typeof body["log"] === "string" ? body["log"].slice(0, 2000) : "";
          const status = String(body["status"] ?? "");
          if (action === "encrypt-status") {
            if (!["encrypting", "encrypted", "encrypt_failed"].includes(status)) return json({ error: "Bad status" }, 400);
            const p = body["encrypted_apk_path"];
            const ok = typeof p === "string" && (/^encrypted-apks\/[\w-]+\.apk$/.test(p) || RELEASE_RE.test(p));
            await db.dbUpdate(`buildRequests/${id}`, { encrypt_status: status, ...(ok ? { encrypted_apk_path: p } : {}), encrypt_log: log, updated_at: now });
            return json({ ok: true });
          }
          if (!["building", "success", "failed"].includes(status)) return json({ error: "Bad input" }, 400);
          const p = body["apk_path"];
          const ok = typeof p === "string" && (/^apks\/[\w-]+\.apk$/.test(p) || RELEASE_RE.test(p));
          await db.dbUpdate(`buildRequests/${id}`, { status, ...(ok ? { apk_path: p } : {}), build_log: log, updated_at: now });
          return json({ ok: true });
        } catch (e) {
          console.error(e);
          return json({ error: "Server error" }, 500);
        }
      },
    },
  },
});
