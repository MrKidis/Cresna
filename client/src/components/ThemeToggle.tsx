import { useTheme } from "@/contexts/ThemeContext";
import { Moon, Sun } from "lucide-react";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, toggleTheme, switchable } = useTheme();
  if (!switchable || !toggleTheme) return null;
  const isDark = theme === "dark";
  return <button type="button" onClick={toggleTheme} className={`inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#17201e]/12 bg-[#fdfdfb] text-[#17201e] transition-colors hover:bg-[#e9ebe5] dark:border-white/12 dark:bg-[#1c2823] dark:text-[#f2f7ef] dark:hover:bg-[#26372e] ${className}`} aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"} title={isDark ? "Switch to light theme" : "Switch to dark theme"}>{isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}</button>;
}
