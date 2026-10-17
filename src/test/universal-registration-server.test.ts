import { afterEach, describe, expect, it, vi } from "vitest";
import { createUniversalRegistration } from "@/lib/universal-registration.server";

vi.mock("@/integrations/firebase/admin.server", () => ({ adminAccessToken: vi.fn(async () => "test-token") }));
const input = { name: "My App", image: "https://i.ibb.co/example/logo.png", deposit: "100", telegram: "", registerLink: "https://example.com/register?inviteCode=ABC" };
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe("Universal registration writes", () => {
  it("reserves apps/<random ID> with the exact record and authenticates every request", async () => {
    vi.stubEnv("UNIVERSAL_FIREBASE_SERVICE_ACCOUNT", "");
    const fetcher = vi.fn(async (_url: string, init?: RequestInit) => new Response(init?.method === "PUT" ? JSON.stringify({ ok: true }) : "null", { headers: { etag: '"null_etag"' } }));
    vi.stubGlobal("fetch", fetcher);
    const result = await createUniversalRegistration(input);
    expect(result.id).toMatch(/^[abcdefghijkmnpqrstuvwxyz23456789]{8}$/);
    expect(fetcher.mock.calls[2]?.[0]).toBe(`https://yususj-default-rtdb.firebaseio.com/apps/${result.id}.json`);
    const write = fetcher.mock.calls[2]?.[1];
    expect(write?.method).toBe("PUT");
    expect(JSON.parse(String(write?.body))).toEqual({ switch: "ON", variables: { name: "My App", image: input.image, deposit: "100", telegram: "", domain: "https://example.com/", invitecode: "register?inviteCode=ABC" } });
    expect(new Headers(write?.headers).get("if-match")).toBe('"null_etag"');
    for (const [, init] of fetcher.mock.calls) expect(new Headers(init?.headers).get("Authorization")).toBe("Bearer test-token");
  });
  it("does not overwrite an occupied app or bin ID", async () => {
    vi.stubEnv("UNIVERSAL_FIREBASE_SERVICE_ACCOUNT", "");
    let reads = 0;
    const fetcher = vi.fn(async (_url: string, init?: RequestInit) => {
      if (init?.method === "PUT") return new Response("{}");
      reads++;
      return new Response(reads <= 2 ? '{"switch":"ON"}' : "null", { headers: { etag: '"null_etag"' } });
    });
    vi.stubGlobal("fetch", fetcher);
    await createUniversalRegistration(input);
    expect(fetcher.mock.calls.filter(([, init]) => init?.method === "PUT")).toHaveLength(1);
    expect(reads).toBe(4);
  });
  it("never falls back to unauthenticated writes when access is denied", async () => {
    vi.stubEnv("UNIVERSAL_FIREBASE_SERVICE_ACCOUNT", "");
    const fetcher = vi.fn(async () => new Response("{}", { status: 401 }));
    vi.stubGlobal("fetch", fetcher);
    await expect(createUniversalRegistration(input)).rejects.toThrow("authorized Firebase service account");
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});