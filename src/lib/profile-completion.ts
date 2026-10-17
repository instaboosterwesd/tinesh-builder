export type CompletionProfile = {
  name?: string;
  telegram_id?: string;
};

export function needsProfileCompletion(profile: CompletionProfile | null | undefined): boolean {
  return !profile?.name?.trim() || !profile.telegram_id?.trim().replace(/^@/, "");
}

export function validateProfileDetails(input: Record<string, unknown>) {
  const name = typeof input["name"] === "string" ? input["name"].trim() : "";
  const telegram_id = typeof input["telegram_id"] === "string" ? input["telegram_id"].trim().replace(/^@/, "") : "";
  if (!name) throw new Error("Name is required");
  if (name.length > 80) throw new Error("Name is too long");
  if (!telegram_id) throw new Error("Telegram username is required");
  if (telegram_id.length > 64 || !/^[A-Za-z0-9_]+$/.test(telegram_id)) {
    throw new Error("Enter a valid Telegram username using letters, numbers or underscores");
  }
  return { name, telegram_id };
}