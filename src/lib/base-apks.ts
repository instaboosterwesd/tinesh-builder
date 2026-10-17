export const BASE_APKS = [
  { id: "bingo", label: "Wingo" },
  { id: "ab", label: "Aviator" },
  { id: "teacher", label: "Teacher" },
] as const;
export type BaseApkId = (typeof BASE_APKS)[number]["id"];
export const baseApkLabel = (id: string) => BASE_APKS.find((b) => b.id === id)?.label ?? id.toUpperCase();
