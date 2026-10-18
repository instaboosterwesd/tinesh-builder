import { describe, expect, it } from "vitest";
import { apkFileName } from "@/lib/telegram.server";

describe("apkFileName", () => {
  it("uses the app name the user built with", () => {
    expect(apkFileName("Lucky Spin")).toBe("Lucky Spin.apk");
  });
  it("removes unsafe characters", () => {
    expect(apkFileName('My/App:"1"')).toBe("MyApp1.apk");
  });
  it("falls back to app.apk when empty", () => {
    expect(apkFileName("  ")).toBe("app.apk");
  });
});
