import { createFileRoute } from "@tanstack/react-router";
import { RELEASE_RE, hmacHex } from "@/lib/server-helpers";

// Signed APK download: verifies the HMAC link issued by signPath(), then
// redirects to a short-lived GitHub download URL for the release asset.
export const Route = createFileRoute("/api/public/apk")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const q = new URL(request.url).searchParams;
        const p = q.get("p") ?? "";
        const e = q.get("e") ?? "";
        const n = q.get("n") ?? "";
        const s = q.get("s") ?? "";
        if (!RELEASE_RE.test(p) || !/^\d+$/.test(e) || Number(e) < Date.now() / 1000) return new Response("Link expired", { status: 403 });
        if (!process.env["BUILD_CALLBACK_SECRET"] || (await hmacHex(`${p}|${e}|${n}`)) !== s) return new Response("Forbidden", { status: 403 });
        const token = process.env["GITHUB_FINE_GRAINED_PERSONAL_ACCESS_TOKEN"] || process.env["GITHUB_TOKEN"];
        const repo = process.env["GITHUB_REPO"];
        if (!token || !repo) return new Response("Not configured", { status: 500 });
        const [, tag, file] = p.split("/");
        const gh = { Authorization: `Bearer ${token}`, "User-Agent": "builder-app", Accept: "application/vnd.github+json" };
        const rel = await fetch(`https://api.github.com/repos/${repo}/releases/tags/${tag}`, { headers: gh });
        if (!rel.ok) {
          console.error(`Release lookup failed [${rel.status}]: ${(await rel.text()).slice(0, 300)}`);
          return new Response("APK not found", { status: 404 });
        }
        const asset = ((await rel.json()) as { assets: { name: string; url: string }[] }).assets.find((a) => a.name === file);
        if (!asset) return new Response("APK not found", { status: 404 });
        const dl = await fetch(asset.url, { headers: { ...gh, Accept: "application/octet-stream" }, redirect: "manual" });
        const loc = dl.headers.get("Location");
        if (loc) return Response.redirect(loc, 302);
        if (!dl.ok || !dl.body) return new Response("Download failed", { status: 502 });
        return new Response(dl.body, {
          headers: {
            "Content-Type": "application/vnd.android.package-archive",
            "Content-Disposition": `attachment; filename="${(n || file!).replace(/"/g, "")}"`,
          },
        });
      },
    },
  },
});
