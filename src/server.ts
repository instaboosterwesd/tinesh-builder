import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isH3SwallowedErrorBody(body)) return response;

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isH3SwallowedErrorBody(body: string): boolean {
  try {
    const payload = JSON.parse(body) as { unhandled?: unknown; message?: unknown };
    return payload.unhandled === true && payload.message === "HTTPError";
  } catch {
    return false;
  }
}

// Media pointers (/__l5e/...) are shipped inside public/__l5e, so static hosting
// (e.g. Vercel) serves them from the repo itself. This proxy is the fallback for
// any pointer that has no local copy.
const ASSET_ORIGIN = "https://ba135e1b-c2e0-4f8a-bfcd-d194076f3097.lovableproject.com";

async function proxyAsset(request: Request): Promise<Response | null> {
  const url = new URL(request.url);
  if (!url.pathname.startsWith("/__l5e/")) return null;
  if (url.hostname.endsWith(".lovable.app") || url.hostname.endsWith(".lovableproject.com")) return null;
  const headers = new Headers();
  const range = request.headers.get("range");
  if (range) headers.set("range", range);
  const res = await fetch(ASSET_ORIGIN + url.pathname + url.search, { headers });
  const out = new Headers(res.headers);
  out.set("cache-control", "public, max-age=31536000, immutable");
  return new Response(res.body, { status: res.status, headers: out });
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      const asset = await proxyAsset(request);
      if (asset) return asset;
      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return await normalizeCatastrophicSsrResponse(response);
    } catch (error) {
      console.error(error);
      return new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },
};
