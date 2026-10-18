// Shared Telegram helpers — pure, client-safe (no server-only imports).

export const DEFAULT_TG_MESSAGE = "Please give me my APK";

/** Message the user sends to the admin when the Telegram download button is on. */
export function tgDownloadText(
  message: string,
  d: { orderId: string; appName: string; name: string; username: string },
) {
  const lines = [message.trim() || DEFAULT_TG_MESSAGE, "", `Order ID: ${d.orderId}`, `App: ${d.appName}`];
  if (d.name) lines.push(`Name: ${d.name}`);
  if (d.username) lines.push(`Username: ${d.username}`);
  return lines.join("\n");
}

/** Accepts "@name", "name" or "https://t.me/name" and returns a t.me share link. */
export function tgDownloadLink(username: string, text: string) {
  const u = username
    .trim()
    .replace(/^@/, "")
    .replace(/^https?:\/\/t\.me\//i, "")
    .replace(/\/.*$/, "");
  return `https://t.me/${u}?text=${encodeURIComponent(text)}`;
}
