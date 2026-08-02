import { Moon, Sun } from "lucide-react";
import { useTheme } from "../hooks/useTheme";

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      title={isDark ? "Switch to light theme" : "Switch to dark theme"}
      className="rounded-lg p-1.5 text-muted transition-colors hover:bg-surface-2 hover:text-bone focus-visible:outline-2 focus-visible:outline-gold"
    >
      {isDark ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  );
}
