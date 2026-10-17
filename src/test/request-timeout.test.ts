import { describe, expect, it, vi } from "vitest";
import { withRequestTimeout } from "@/lib/request-timeout";

describe("Account request timeout", () => {
  it("returns real data when the request succeeds", async () => {
    await expect(withRequestTimeout(async () => ({ balance: 125 }))).resolves.toEqual({ balance: 125 });
  });
  it("preserves request failures instead of leaving loading pending", async () => {
    await expect(withRequestTimeout(async () => { throw new Error("Unavailable"); })).rejects.toThrow("Unavailable");
  });
  it("rejects a hung request after the timeout", async () => {
    vi.useFakeTimers();
    try {
      const request = withRequestTimeout(() => new Promise<never>(() => {}), 100);
      const assertion = expect(request).rejects.toThrow("Request timed out");
      await vi.advanceTimersByTimeAsync(100);
      await assertion;
    } finally {
      vi.useRealTimers();
    }
  });
});