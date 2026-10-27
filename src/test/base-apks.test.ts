import { describe, expect, it } from "vitest";
import { BASE_APKS, baseNeedsAppId } from "@/lib/base-apks";

describe("Universal base compatibility", () => {
  it("adds a distinct base without renaming stored template IDs", () => {
    expect(BASE_APKS.map((base) => base.id)).toEqual(["bingo", "ab", "teacher", "universal_back_fix"]);
  });
  it("requires Universal registration for the uploaded back-fix base", () => {
    expect(baseNeedsAppId("universal_back_fix")).toBe(true);
    expect(baseNeedsAppId("teacher")).toBe(true);
  });
});