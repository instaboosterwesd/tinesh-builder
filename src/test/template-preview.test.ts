import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ rows: {} as Record<string, Record<string, unknown>>, writes: vi.fn(), updates: vi.fn() }));
vi.mock("@tanstack/react-start", () => ({ createServerFn: () => {
  let validate = (data: unknown) => data;
  const chain = {
    middleware: () => chain,
    inputValidator: (fn: typeof validate) => { validate = fn; return chain; },
    handler: (fn: (args: unknown) => unknown) => (args?: { data: unknown }) => fn({ data: validate(args?.data), context: { userId: "user-1" } }),
  };
  return chain;
} }));
vi.mock("@tanstack/react-router", () => ({ createFileRoute: () => (options: unknown) => options }));
vi.mock("@/integrations/firebase/auth-middleware", () => ({ requireFirebaseAuth: {} }));
vi.mock("@/lib/server-helpers", () => ({
  apkName: vi.fn(), APP_ID_RE: /^[a-z0-9]+$/, checkPassword: vi.fn(), int: (v: unknown) => Number(v), LOGO_RE: /^logos\//,
  signPath: vi.fn(async () => null), RELEASE_RE: /^release\//,
  str: (v: unknown) => typeof v === "string" ? v : "", uuid: (v: unknown) => v, walletChange: vi.fn(),
}));
vi.mock("@/integrations/firebase/admin.server", () => ({
  dbGet: vi.fn(async (path: string) => path === "templates" ? state.rows : path.startsWith("templates/") ? state.rows[path.slice(10)] : { template_id: "template-1", app_name: "My App" }),
  dbSet: state.writes, dbUpdate: state.updates,
}));

import { adminSaveTemplate, adminListTemplates, getTemplate, listTemplates } from "@/lib/builder.functions";
import { Route } from "@/routes/api/public/build";

const buildHtml = "<html><body>APK logic</body></html>";
const previewHtml = "<html><body>Visitor preview</body></html>";
beforeEach(() => {
  vi.clearAllMocks();
  state.rows = { "template-1": { name: "Test", base_apk: "bingo", html: buildHtml, preview_html: previewHtml, show_preview: true, price: 0 } };
});

describe("Separate template preview HTML", () => {
  for (const edit of [false, true]) {
    it(`${edit ? "edit" : "add"} saves both HTML files separately`, async () => {
      await adminSaveTemplate({ data: { password: "test-only", ...(edit ? { id: "template-1" } : {}), name: "Test", base_apk: "bingo", html: buildHtml, preview_html: previewHtml, price: 0 } });
      expect((edit ? state.updates : state.writes).mock.calls[0]?.[1]).toMatchObject({ html: buildHtml, preview_html: previewHtml });
    });
  }
  it("visitor detail returns preview HTML without build HTML", async () => {
    expect(await getTemplate({ data: { id: "template-1" } })).toMatchObject({ html: "", preview_html: previewHtml });
  });
  it("legacy templates keep their existing live preview", async () => {
    delete state.rows["template-1"]?.["preview_html"];
    expect(await getTemplate({ data: { id: "template-1" } })).toMatchObject({ html: "", preview_html: buildHtml });
  });
  it("disabled preview exposes neither HTML file", async () => {
    state.rows["template-1"] = { ...state.rows["template-1"], show_preview: false };
    expect(await getTemplate({ data: { id: "template-1" } })).toMatchObject({ html: "", preview_html: "" });
  });
  it("admin edit reads the two stored files", async () => {
    expect((await adminListTemplates({ data: { password: "test-only" } }))[0]).toMatchObject({ html: buildHtml, preview_html: previewHtml });
  });
  it("catalog does not send either HTML file", async () => {
    expect((await listTemplates())[0]).toMatchObject({ html: "", preview_html: "" });
  });
  it("GitHub build callback keeps using the original build HTML", async () => {
    vi.stubEnv("BUILD_CALLBACK_SECRET", "test-only-secret");
    try {
      const route = Route as unknown as { server: { handlers: { GET: (args: { request: Request }) => Promise<Response> } } };
      const response = await route.server.handlers.GET({ request: new Request("https://example.com/api/public/build?id=request-1", { headers: { "x-build-secret": "test-only-secret" } }) });
      const result = await response.json();
      expect(result.html).toBe(buildHtml);
      expect(result).not.toHaveProperty("preview_html");
    } finally { vi.unstubAllEnvs(); }
  });
});