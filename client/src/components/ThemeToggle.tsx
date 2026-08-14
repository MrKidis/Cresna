import { useTheme } from "@/contexts/ThemeContext";
import { Button } from "@/components/ui/button";
import { Moon, Sun } from "lucide-react";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, toggleTheme, switchable } = useTheme();
  if (!switchable || !toggleTheme) return null;
  const isDark = theme === "dark";
  return <Button type="button" variant="outline" size="icon" onClick={toggleTheme} className={`h-9 w-9 rounded-full bg-card text-card-foreground hover:bg-secondary ${className}`} aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"} title={isDark ? "Switch to light theme" : "Switch to dark theme"}>{isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}</Button>;
}
