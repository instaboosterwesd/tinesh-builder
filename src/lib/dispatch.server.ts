import { signPath } from "@/lib/server-helpers";

function config() {
  const token = process.env["GITHUB_FINE_GRAINED_PERSONAL_ACCESS_TOKEN"] || process.env["GITHUB_TOKEN"];
  const secret = process.env["BUILD_CALLBACK_SECRET"];
  const repo = process.env["GITHUB_REPO"]; // "owner/repo"
  return { token, secret, repo };
}

async function builderUrl() {
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

async function dispatch(event_type: string, client_payload: Record<string, unknown>) {
  const { token, repo } = config();
  return fetch(`https://api.github.com/repos/${repo}/dispatches`, {
    method: "POST",
    headers: { Accept: "application/vnd.github+json", Authorization: `Bearer ${token}`, "User-Agent": "builder-app" },
    body: JSON.stringify({ event_type, client_payload }),
  });
}

async function updateBuild(id: string, patch: Record<string, unknown>) {
  const { dbUpdate } = await import("@/integrations/firebase/admin.server");
  await dbUpdate(`buildRequests/${id}`, { ...patch, updated_at: new Date().toISOString() });
}

export async function dispatchBuild(req: { id: string; app_name: string; package_name: string; app_id?: string | null }) {
  const { token, secret, repo } = config();
  const url = await builderUrl();
  let status = "approved";
  let log = "Queued. Build server is not configured yet.";
  let github = false;
  if (token && repo && secret && url) {
    const res = await dispatch("build-apk", {
      request_id: req.id,
      app_name: req.app_name,
      package_name: req.package_name,
      app_id: req.app_id ?? null,
      builder_url: url,
      secret,
    });
    if (res.ok) {
      status = "building";
      log = "Build started.";
      github = true;
    } else {
      status = "failed";
      log = `Build dispatch failed [${res.status}]: ${(await res.text()).slice(0, 300)}`;
    }
  }
  await updateBuild(req.id, { status, build_log: log });
  return { status, github, log };
}

export async function dispatchEncrypt(req: { id: string; app_name: string; apk_path: string }) {
  const { token, secret, repo } = config();
  const url = await builderUrl();
  const apkUrl = await signPath(req.apk_path);
  let encrypt_status = "idle";
  let encrypt_log = "Build server is not configured yet.";
  let github = false;
  if (token && repo && secret && url && apkUrl) {
    const res = await dispatch("encrypt-apk", { request_id: req.id, app_name: req.app_name, apk_url: apkUrl, builder_url: url, secret });
    if (res.ok) {
      encrypt_status = "encrypting";
      encrypt_log = "Encryption started.";
      github = true;
    } else {
      encrypt_status = "encrypt_failed";
      encrypt_log = `Dispatch failed [${res.status}]: ${(await res.text()).slice(0, 300)}`;
    }
  }
  await updateBuild(req.id, { encrypt_status, encrypt_log });
  return { encrypt_status, github, encrypt_log };
}
