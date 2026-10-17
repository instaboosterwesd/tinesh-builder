import { describe, expect, it } from "vitest";
import { BUILD_PACKAGES, randomPackageName } from "@/lib/package-name";

describe("APK package names", () => {
  it("selects exactly the ten requested package names", () => {
    expect(BUILD_PACKAGES).toEqual([
      "com.tineshmod.a1", "com.tineshmod.a2", "com.tineshmod.a3", "com.tineshmod.a4", "com.tineshmod.a5",
      "com.tineshmod.a6", "com.tineshmod.a7", "com.tineshmod.a8", "com.tineshmod.a9", "com.tineshmod.a10",
    ]);
    for (let i = 0; i < 10; i++) expect(randomPackageName(() => (i + 0.5) / 10)).toBe(`com.tineshmod.a${i + 1}`);
  });
});