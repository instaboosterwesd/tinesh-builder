import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type IconscoutItem = { uuid: string; name: string; thumb: string | null; asset: string };
export type IconscoutResult =
  | { status: "ok"; items: IconscoutItem[]; total: number }
  | { status: "empty" }
  | { status: "auth_error" }
  | { status: "rate_limited"; retryAfter: number | null }
  | { status: "error"; message: string };

/** Server-side IconScout search proxy. Client-Secret never leaves the server. */
export const searchIconscout = createServerFn({ method: "GET" })
  .inputValidator((d) =>
    z.object({
      query: z.string().trim().min(1).max(80),
      asset: z.enum(["icon", "illustration", "3d", "lottie"]).default("lottie"),
      page: z.number().int().min(1).max(50).default(1),
    }).parse(d),
  )
  .handler(async ({ data }): Promise<IconscoutResult> => {
    const id = process.env["ICONSCOUT_CLIENT_ID"];
    const secret = process.env["ICONSCOUT_CLIENT_SECRET"];
    if (!id || !secret) return { status: "auth_error" };
    const url = new URL("https://api.iconscout.com/v3/search");
    url.search = new URLSearchParams({ query: data.query, asset: data.asset, page: String(data.page), per_page: "12", product_type: "item", price: "free" }).toString();
    try {
      const res = await fetch(url, { headers: { "Client-ID": id, "Client-Secret": secret }, signal: AbortSignal.timeout(12_000) });
      if (res.status === 401 || res.status === 403) return { status: "auth_error" };
      if (res.status === 429) {
        const ra = Number(res.headers.get("Retry-After"));
        return { status: "rate_limited", retryAfter: Number.isFinite(ra) && ra > 0 ? ra : null };
      }
      if (!res.ok) return { status: "error", message: `IconScout is unavailable (${res.status}).` };
      const json = (await res.json()) as { response?: { items?: { total?: number; data?: Array<{ uuid: string; name: string; asset: string; urls?: { thumb?: string } }> } } };
      const list = json.response?.items?.data ?? [];
      if (!list.length) return { status: "empty" };
      return { status: "ok", total: json.response?.items?.total ?? list.length, items: list.map((i) => ({ uuid: i.uuid, name: i.name, asset: i.asset, thumb: i.urls?.thumb ?? null })) };
    } catch {
      return { status: "error", message: "Network problem reaching IconScout. Please try again." };
    }
  });
