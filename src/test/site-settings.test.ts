import { describe, expect, it } from "vitest";
import { siteName, validateSiteIdentity, visibleAnnouncement } from "@/lib/site-settings";

describe("Admin-controlled website identity", () => {
  it("uses the saved website name instead of the default", () => {
    expect(siteName({ site_name: " My Builder " })).toBe("My Builder");
    expect(siteName(null)).toBe("AppForge");
  });
  it("validates and trims the admin's website name", () => {
    expect(validateSiteIdentity({ site_name: " My Builder " }).site_name).toBe("My Builder");
    expect(() => validateSiteIdentity({ site_name: " " })).toThrow("Website name is required");
  });
  it("shows an enabled announcement to arriving visitors", () => {
    expect(visibleAnnouncement({ announcement_enabled: true, announcement_message: "New templates available" })).toBe(true);
  });
  it("hides disabled or empty announcements", () => {
    expect(visibleAnnouncement({ announcement_enabled: false, announcement_message: "New templates available" })).toBe(false);
    expect(visibleAnnouncement({ announcement_enabled: true, announcement_message: " " })).toBe(false);
  });
  it("requires a message before publishing an announcement", () => {
    expect(() => validateSiteIdentity({ site_name: "AppForge", announcement_enabled: true, announcement_message: " " })).toThrow("Announcement message is required");
  });
});