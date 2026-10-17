import { useEffect, useState } from "react";

const KEY = "builder-admin-pass";

export function getAdminPass() {
  if (typeof window === "undefined") return "";
  return sessionStorage.getItem(KEY) ?? "";
}
export function setAdminPass(p: string) {
  sessionStorage.setItem(KEY, p);
  window.dispatchEvent(new Event("admin-auth"));
}
export function clearAdminPass() {
  sessionStorage.removeItem(KEY);
  window.dispatchEvent(new Event("admin-auth"));
}

export function useAdminPass() {
  const [pass, setPass] = useState<string | null>(null);
  useEffect(() => {
    const sync = () => setPass(getAdminPass());
    sync();
    window.addEventListener("admin-auth", sync);
    return () => window.removeEventListener("admin-auth", sync);
  }, []);
  return pass; // null = not hydrated yet
}
