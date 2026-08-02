// useTheme — reads/writes the data-theme attribute set by the inline
// bootstrap script in index.html, and persists the user's explicit choice
// so it survives reloads independent of the OS-level preference.
import { useEffect, useState } from "react";

export type Theme = "dark" | "light";

const STORAGE_KEY = "alphadesk-theme";

function currentTheme(): Theme {
  return document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(currentTheme);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === "dark" ? "light" : "dark"));

  return { theme, toggleTheme };
}
