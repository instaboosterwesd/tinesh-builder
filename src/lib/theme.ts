import { useEffect, useState } from "react";

export type Theme = "light" | "dark";
const KEY = "builder-theme";

// Runs in <head> before paint so there's no flash of the wrong theme.
// Default is dark: only an explicit saved "light" choice switches to light.
export const themeInitScript = `(function(){try{var t=localStorage.getItem('${KEY}');if(!t){t='dark'}if(t==='dark')document.documentElement.classList.add('dark')}catch(e){document.documentElement.classList.add('dark')}})()`;

export function useTheme() {
  const [theme, setTheme] = useState<Theme>("dark");
  useEffect(() => {
    setTheme(document.documentElement.classList.contains("dark") ? "dark" : "light");
  }, []);
  function toggle() {
    // The welcome tour overlays the page; close it so this tap always lands.
    window.dispatchEvent(new CustomEvent("appforge-dismiss-tour"));
    const next: Theme = theme === "dark" ? "light" : "dark";
    document.documentElement.classList.toggle("dark", next === "dark");
    localStorage.setItem(KEY, next);
    setTheme(next);
  }
  return { theme, toggle };
}
