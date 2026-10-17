export const BUILD_PACKAGES = Array.from({ length: 10 }, (_, index) => `com.tineshmod.a${index + 1}`);

export function randomPackageName(random: () => number = Math.random): string {
  const index = Math.floor(random() * BUILD_PACKAGES.length);
  const name = BUILD_PACKAGES[index];
  if (!name) throw new Error("Invalid random package selection");
  return name;
}