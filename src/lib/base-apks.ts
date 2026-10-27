// Base apps the builder can patch. `needsAppId` bases receive an automatically
// created registration ID. Ids are stored on templates — never rename an id.
export const BASE_APKS = [
  { id: "bingo", label: "Wingo", needsAppId: false },
  { id: "ab", label: "Aviator", needsAppId: false },
  { id: "teacher", label: "Universal", needsAppId: true },
  { id: "universal_back_fix", label: "Universal Back Fix", needsAppId: true },
] as const;
export type BaseApkId = (typeof BASE_APKS)[number]["id"];
export const baseApkLabel = (id: string) => BASE_APKS.find((b) => b.id === id)?.label ?? id.toUpperCase();
export const baseNeedsAppId = (id: string) => !!BASE_APKS.find((b) => b.id === id)?.needsAppId;
