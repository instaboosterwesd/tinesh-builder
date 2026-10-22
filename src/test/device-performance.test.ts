import { beforeEach, describe, expect, it } from "vitest";
import { getDevicePerformance, setDevicePerformance } from "@/lib/device-performance";
import { STICKERS, STICKER_ICON, stickerIconFor, type StickerName } from "@/lib/stickers";

describe("device performance preference", () => {
  beforeEach(() => localStorage.clear());

  it("is unset for a new visitor", () => {
    expect(getDevicePerformance()).toBeNull();
  });

  it("remembers the chosen value", () => {
    setDevicePerformance("low");
    expect(getDevicePerformance()).toBe("low");
    setDevicePerformance("high");
    expect(getDevicePerformance()).toBe("high");
  });

  it("ignores invalid stored values", () => {
    localStorage.setItem("appforge-device-performance", "ultra");
    expect(getDevicePerformance()).toBeNull();
  });
});

describe("plain icon fallbacks", () => {
  it("every sticker has a plain icon", () => {
    for (const name of Object.keys(STICKERS) as StickerName[]) {
      expect(STICKER_ICON[name], name).toBeTruthy();
    }
  });

  it("resolves a sticker URL to its icon", () => {
    expect(stickerIconFor(STICKERS.wallet)).toBe(STICKER_ICON.wallet);
  });

  it("returns undefined for non-sticker sources", () => {
    expect(stickerIconFor("https://example.com/loader.json")).toBeUndefined();
  });
});
