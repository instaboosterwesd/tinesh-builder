import { afterEach, describe, expect, it, vi } from "vitest";
import { uploadImage, validateLogoUpload } from "@/lib/image-upload";
import { uuid } from "@/lib/server-helpers";

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe("Build image uploads", () => {
  it("accepts Firebase push IDs in template links", () => {
    expect(uuid("-Oab1234567890xyzABCD")).toBe("-Oab1234567890xyzABCD");
    expect(() => uuid("../templates")).toThrow();
  });
  it("reads image bytes rather than attempting a nonexistent bucket upload", async () => {
    vi.stubEnv("IMGBB_API_KEY", "test-key");
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: true, data: { url: "https://i.ibb.co/example/logo.png" } })));
    vi.stubGlobal("fetch", fetcher);
    const data = validateLogoUpload({ filename: "logo.png", image: "data:image/png;base64,aGVsbG8=" });
    expect(await uploadImage(data.image)).toBe("https://i.ibb.co/example/logo.png");
    expect((fetcher.mock.calls[0]?.[1].body as FormData).get("image")).toBe("aGVsbG8=");
  });
  it("rejects a failed provider response instead of storing a broken URL", async () => {
    vi.stubEnv("IMGBB_API_KEY", "test-key");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response('{}', { status: 400 })));
    await expect(uploadImage("aGVsbG8=")).rejects.toThrow("Photo upload failed");
  });
});