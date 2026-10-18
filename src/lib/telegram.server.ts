// Server-only Telegram notifications. Never import this from client code.

type BuildInfo = {
  id: string;
  app_name: string;
  package_name: string;
  template_name: string;
  user_id?: string | null;
  requester_name: string;
  requester_email: string;
  requester_telegram?: string;
  apk_path: string;
};

async function fetchReleaseApk(apkPath: string): Promise<{ bytes: ArrayBuffer; file: string } | null> {
  const token = process.env["GITHUB_FINE_GRAINED_PERSONAL_ACCESS_TOKEN"] || process.env["GITHUB_TOKEN"];
  const repo = process.env["GITHUB_REPO"];
  if (!token || !repo || !apkPath.startsWith("release/")) return null;
  const [, tag, file] = apkPath.split("/");
  const gh = { Authorization: `Bearer ${token}`, "User-Agent": "builder-app", Accept: "application/vnd.github+json" };
  const rel = await fetch(`https://api.github.com/repos/${repo}/releases/tags/${tag}`, { headers: gh });
  if (!rel.ok) return null;
  const asset = ((await rel.json()) as { assets: { name: string; url: string }[] }).assets.find((a) => a.name === file);
  if (!asset) return null;
  const dl = await fetch(asset.url, { headers: { ...gh, Accept: "application/octet-stream" } });
  if (!dl.ok) return null;
  return { bytes: await dl.arrayBuffer(), file: file! };
}

/** Safe file name from the app name the user built with, e.g. "My Game.apk". */
export function apkFileName(appName: string): string {
  const base = appName.replace(/[\\/:*?"<>|\x00-\x1f]/g, "").replace(/\s+/g, " ").trim().slice(0, 60);
  return `${base || "app"}.apk`;
}

/** After a build succeeds: send full order details + the APK file to the admin's Telegram chat. */
export async function notifyBuildComplete(build: BuildInfo): Promise<void> {
  const db = await import("@/integrations/firebase/admin.server");
  const s = await db.dbGet<{ tg_notify_enabled?: boolean; tg_notify_chat_id?: string; tg_bot_token?: string }>("settings/main");
  // Admin-panel token wins; the stored secret is the fallback.
  const token = s?.tg_bot_token?.trim() || process.env["TELEGRAM_BOT_TOKEN"];
  if (!token) return;
  const chatId = (s?.tg_notify_chat_id ?? "8921430516").trim();
  if (s?.tg_notify_enabled === false || !chatId) return;

  const caption = [
    `✅ Build complete: ${build.app_name}`,
    "",
    `Order ID: ${build.id}`,
    `App: ${build.app_name}`,
    `Package: ${build.package_name}`,
    `Template: ${build.template_name}`,
    `Name: ${build.requester_name || "-"}`,
    `Telegram: ${build.requester_telegram ? "@" + build.requester_telegram : "-"}`,
    `Email: ${build.requester_email || "-"}`,
    `User ID: ${build.user_id || "-"}`,
  ].join("\n").slice(0, 1000);

  const api = `https://api.telegram.org/bot${token}`;
  let sent = false;
  try {
    const apk = await fetchReleaseApk(build.apk_path);
    if (apk) {
      const form = new FormData();
      form.set("chat_id", chatId);
      form.set("caption", caption);
      form.set("document", new Blob([apk.bytes], { type: "application/vnd.android.package-archive" }), apkFileName(build.app_name));
      const r = await fetch(`${api}/sendDocument`, { method: "POST", body: form });
      sent = r.ok;
      if (!r.ok) console.error(`Telegram sendDocument failed [${r.status}]: ${(await r.text()).slice(0, 300)}`);
    }
  } catch (e) {
    console.error("Telegram document send error:", e instanceof Error ? e.message : e);
  }
  if (!sent) {
    const r = await fetch(`${api}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: caption }),
    });
    if (!r.ok) console.error(`Telegram sendMessage failed [${r.status}]: ${(await r.text()).slice(0, 300)}`);
  }
}
