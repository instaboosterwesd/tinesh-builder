export const REGISTRATION_DB = "https://yususj-default-rtdb.firebaseio.com";
const ID_ALPHABET = "abcdefghijkmnpqrstuvwxyz23456789";

export type RegistrationVariables = {
  deposit: string; name: string; image: string; telegram: string; domain: string; invitecode: string;
};

export function registrationId(random: () => number = Math.random): string {
  return Array.from({ length: 8 }, () => ID_ALPHABET[Math.floor(random() * ID_ALPHABET.length)]).join("");
}

export function splitRegisterLink(value: string) {
  let url: URL;
  try { url = new URL(value.trim()); } catch { throw new Error("Enter a valid register link"); }
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) throw new Error("Enter an http(s) register link without credentials");
  // Hash-router links keep /#/ in domain; normal links keep their parent path.
  const route = url.hash.startsWith("#/") ? url.hash.slice(2) : url.pathname.replace(/^\//, "") + url.search + url.hash;
  const slash = (route.split("?")[0] ?? "").lastIndexOf("/");
  const parent = slash < 0 ? "" : route.slice(0, slash + 1);
  return {
    domain: url.hash.startsWith("#/") ? `${url.origin}${url.pathname}#/${parent}` : `${url.origin}/${parent}`,
    invitecode: route.slice(parent.length),
  };
}

export function registrationRecord(input: { name: string; image: string; deposit: string; telegram: string; registerLink: string }) {
  return {
    switch: "ON" as const,
    variables: { name: input.name, image: input.image, deposit: input.deposit, telegram: input.telegram, ...splitRegisterLink(input.registerLink) },
  };
}
