export const DEFAULT_SITE_NAME = "AppForge";

export type SiteIdentity = {
  site_name?: string;
  announcement_enabled?: boolean;
  announcement_title?: string;
  announcement_message?: string;
};

export function siteName(settings?: SiteIdentity | null) {
  return settings?.site_name?.trim() || DEFAULT_SITE_NAME;
}

export function visibleAnnouncement(settings?: SiteIdentity | null) {
  return settings?.announcement_enabled === true && !!settings.announcement_message?.trim();
}

export function validateSiteIdentity(data: Record<string, unknown>) {
  const text = (key: string, label: string, max: number) => {
    const value = typeof data[key] === "string" ? data[key].trim() : "";
    if (value.length > max) throw new Error(`${label} is too long`);
    return value;
  };
  const name = text("site_name", "Website name", 80);
  if (!name) throw new Error("Website name is required");
  const title = text("announcement_title", "Announcement title", 120);
  const message = text("announcement_message", "Announcement message", 2000);
  const enabled = data["announcement_enabled"] === true;
  if (enabled && !message) throw new Error("Announcement message is required");
  return { site_name: name, announcement_enabled: enabled, announcement_title: title, announcement_message: message };
}