import { createServerFn } from "@tanstack/react-start";
import { checkPassword } from "@/lib/server-helpers";

export type AudioConfig = { enabled: boolean; sounds: Record<string, string> };

async function read(): Promise<AudioConfig> {
  const db = await import("@/integrations/firebase/admin.server");
  const r = await db.dbGet<Partial<AudioConfig>>("audio");
  return { enabled: r?.enabled === true, sounds: r?.sounds && typeof r.sounds === "object" ? r.sounds : {} };
}

/** Public: click-sound settings for visitors. */
export const getAudioConfig = createServerFn({ method: "GET" }).handler(async () => {
  try { return await read(); } catch (e) {
    console.error("getAudioConfig failed:", e instanceof Error ? e.message : e);
    return { enabled: false, sounds: {} } as AudioConfig;
  }
});

export const adminGetAudio = createServerFn({ method: "POST" })
  .inputValidator((d: { password: string }) => d)
  .handler(async ({ data }) => { checkPassword(data?.password); return read(); });

export const adminSaveAudio = createServerFn({ method: "POST" })
  .inputValidator((d: { password: string; enabled?: boolean; key?: string; url?: string | null }) => {
    const out: { password: string; enabled?: boolean; key?: string; url?: string | null } = { password: String(d?.password ?? "") };
    if (typeof d?.enabled === "boolean") out.enabled = d.enabled;
    if (d?.key !== undefined) {
      if (typeof d.key !== "string" || !/^[A-Za-z0-9_-]{1,200}$/.test(d.key)) throw new Error("Bad sound slot");
      out.key = d.key;
      if (d.url === null || d.url === "") out.url = null;
      else if (typeof d.url === "string" && /^https:\/\/\S{1,1000}$/.test(d.url)) out.url = d.url;
      else throw new Error("Sound link must start with https://");
    }
    return out;
  })
  .handler(async ({ data }) => {
    checkPassword(data.password);
    const db = await import("@/integrations/firebase/admin.server");
    if (data.enabled !== undefined) await db.dbUpdate("audio", { enabled: data.enabled });
    if (data.key) {
      if (data.url) await db.dbSet(`audio/sounds/${data.key}`, data.url);
      else await db.dbRemove(`audio/sounds/${data.key}`);
    }
    return read();
  });
