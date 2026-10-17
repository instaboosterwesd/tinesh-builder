import "@/lib/server-env";
import { createFileRoute } from "@tanstack/react-router";

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

const isUuid = (s: unknown): s is string => typeof s === "string" && /^[0-9a-f-]{36}$/i.test(s);

export const Route = createFileRoute("/api/public/build")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (!authorized(request)) return json({ error: "Unauthorized" }, 401);
        const id = new URL(request.url).searchParams.get("id") ?? "";
        const { getAdminClient } = await import("@/lib/admin-client");
        const supabaseAdmin = await getAdminClient();
        const { data: req } = await supabaseAdmin.from("build_requests").select("*").eq("id", id).maybeSingle();
        if (!req) return json({ error: "Not found" }, 404);
        const { data: t } = await supabaseAdmin.from("templates").select("base_apk, html").eq("id", req.template_id ?? "").maybeSingle();
        let logo_url: string | null = null;
        if (req.logo_path) {
          const { data } = await supabaseAdmin.storage.from("media").createSignedUrl(req.logo_path, 3600);
          logo_url = data?.signedUrl ?? null;
        }
        return json({ app_name: req.app_name, package_name: req.package_name, register_link: req.register_link, logo_url, base_apk: t?.base_apk ?? "bingo", html: t?.html ?? "", app_id: req.app_id ?? null });
      },
      POST: async ({ request }) => {
        if (!authorized(request)) return json({ error: "Unauthorized" }, 401);
        const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
        const { getAdminClient } = await import("@/lib/admin-client");
        const sb = await getAdminClient();
        const action = body["action"];

        if (action === "upload-url" && isUuid(body["id"])) {
          const path = `apks/${body["id"]}-${Date.now()}.apk`;
          const { data, error } = await sb.storage.from("media").createSignedUploadUrl(path);
          if (error) return json({ error: error.message }, 500);
          return json({ path, url: data.signedUrl });
        }

        if (action === "encrypt-upload-url" && isUuid(body["id"])) {
          const path = `encrypted-apks/${body["id"]}-${Date.now()}.apk`;
          const { data, error } = await sb.storage.from("media").createSignedUploadUrl(path);
          if (error) return json({ error: error.message }, 500);
          return json({ path, url: data.signedUrl });
        }

        if (action === "encrypt-status" && isUuid(body["id"])) {
          const allowed = ["encrypting", "encrypted", "encrypt_failed"];
          const status = String(body["status"] ?? "");
          if (!allowed.includes(status)) return json({ error: "Bad status" }, 400);
          const encPath = typeof body["encrypted_apk_path"] === "string" && /^encrypted-apks\/[\w-]+\.apk$/.test(body["encrypted_apk_path"])
            ? body["encrypted_apk_path"] : undefined;
          const { error } = await sb.from("build_requests").update({
            encrypt_status: status,
            ...(encPath ? { encrypted_apk_path: encPath } : {}),
            encrypt_log: typeof body["log"] === "string" ? body["log"].slice(0, 2000) : "",
            updated_at: new Date().toISOString(),
          }).eq("id", body["id"]);
          if (error) return json({ error: error.message }, 500);
          return json({ ok: true });
        }

        // Default: build status update
        const allowed = ["building", "success", "failed"];
        const status = String(body["status"] ?? "");
        if (!allowed.includes(status) || !isUuid(body["id"])) return json({ error: "Bad input" }, 400);
        const { error } = await sb
          .from("build_requests")
          .update({
            status,
            ...(typeof body["apk_path"] === "string" && /^apks\/[\w-]+\.apk$/.test(body["apk_path"]) ? { apk_path: body["apk_path"] } : {}),
            build_log: typeof body["log"] === "string" ? body["log"].slice(0, 2000) : "",
            updated_at: new Date().toISOString(),
          })
          .eq("id", body["id"]);
        if (error) return json({ error: error.message }, 500);
        return json({ ok: true });
      },
    },
  },
});
