import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ base: "teacher", writes: vi.fn(), dispatch: vi.fn(async (_request: unknown) => ({ github: true })) }));
// Exercise the real validators and handlers without the RPC transport.
vi.mock("@tanstack/react-start", () => ({ createServerFn: () => {
  let validate = (data: unknown) => data;
  const chain = {
    middleware: () => chain,
    inputValidator: (fn: typeof validate) => { validate = fn; return chain; },
    handler: (fn: (args: unknown) => unknown) => (args: { data: unknown }) => fn({ data: validate(args.data), context: { userId: "user-1" } }),
  };
  return chain;
} }));
vi.mock("@/integrations/firebase/auth-middleware", () => ({ requireFirebaseAuth: {} }));
vi.mock("@/lib/server-helpers", () => ({
  apkName: vi.fn(), APP_ID_RE: /^[a-z0-9]+$/, checkPassword: vi.fn(), int: vi.fn(), LOGO_RE: /^logos\//,
  signPath: vi.fn(async () => "https://example.com/logo.png"),
  str: (value: unknown) => typeof value === "string" ? value : "", uuid: (value: unknown) => value, walletChange: vi.fn(),
}));
vi.mock("@/integrations/firebase/admin.server", () => ({
  dbGet: vi.fn(async (path: string) => path.startsWith("templates/") ? { name: "Template", base_apk: state.base, price: 0 } : path.startsWith("mediaFiles/") ? { user_id: "user-1" } : { name: "User" }),
  dbSet: state.writes,
}));
vi.mock("@/lib/universal-registration.server", () => ({ createUniversalRegistration: vi.fn(async () => ({ id: "abcd2345" })), removeUniversalRegistration: vi.fn() }));
vi.mock("@/lib/dispatch.server", () => ({ dispatchBuild: state.dispatch }));

import { adminBuild, userBuild } from "@/lib/builder.functions";
import { createUniversalRegistration } from "@/lib/universal-registration.server";
import { baseNeedsAppId } from "@/lib/base-apks";

beforeEach(() => { vi.clearAllMocks(); vi.spyOn(Math, "random").mockReturnValue(0.95); });
afterEach(() => vi.restoreAllMocks());

describe("Server build package policy", () => {
  for (const base of ["teacher", "universal_back_fix", "bingo", "ab"]) {
    for (const role of ["user", "admin"]) {
      it(`${role} ${base} ignores client package names and persists the random allowed package before dispatch`, async () => {
        state.base = base;
        const build = role === "user" ? userBuild : adminBuild;
        await build({ data: { template_id: "template-1", app_name: "My App", package_name: "com.user.custom", logo_path: "logos/test.png", register_link: "https://example.com/register", password: "test-only" } });
        expect(state.writes.mock.calls[0]?.[1]).toMatchObject({ package_name: "com.tineshmod.a10" });
        expect(state.dispatch.mock.calls[0]?.[0]).toMatchObject({ package_name: "com.tineshmod.a10" });
        expect(state.writes.mock.invocationCallOrder[0]).toBeLessThan(state.dispatch.mock.invocationCallOrder[0] ?? 0);
      });
      it(`${role} ${base} preserves its configured registration behavior`, async () => {
        state.base = base;
        const build = role === "user" ? userBuild : adminBuild;
        await build({ data: { template_id: "template-1", app_name: "My App", logo_path: "logos/test.png", register_link: "https://example.com/register", password: "test-only" } });
        if (baseNeedsAppId(base)) {
          expect(createUniversalRegistration).toHaveBeenCalledWith(expect.objectContaining({ name: "My App", image: "https://example.com/logo.png", registerLink: "https://example.com/register" }));
          expect(state.writes.mock.calls[0]?.[1]).toMatchObject({ app_id: "abcd2345", app_name: "My App", logo_path: "logos/test.png" });
          expect(state.dispatch.mock.calls[0]?.[0]).toMatchObject({ app_id: "abcd2345", app_name: "My App", logo_path: "logos/test.png" });
        } else {
          expect(createUniversalRegistration).not.toHaveBeenCalled();
          expect(state.dispatch.mock.calls[0]?.[0]).toMatchObject({ app_id: null });
        }
      });
    }
  }
});