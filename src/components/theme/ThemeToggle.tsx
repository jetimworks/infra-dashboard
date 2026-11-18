import { Moon, Sun } from "lucide-react"
import { useTheme } from "../../hooks/useTheme"
import { cn } from "../../lib/utils"

export interface ThemeToggleProps {
  /** "appbar" renders for the graphite console header. */
  variant?: "appbar" | "surface"
}

export function ThemeToggle({ variant = "appbar" }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme()
  const onAppBar = variant === "appbar"
  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
      title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
      className={cn(
        "inline-flex h-9 w-9 items-center justify-center rounded-md transition-colors",
        onAppBar
          ? "text-appbar-muted hover:bg-appbar-raised hover:text-appbar-fg"
          : "text-fg-muted hover:bg-surface-sunken hover:text-fg"
      )}
    >
      {theme === "dark" ? (
        <Sun className="h-4 w-4" aria-hidden />
      ) : (
        <Moon className="h-4 w-4" aria-hidden />
      )}
    </button>
  )
}

ThemeToggle.displayName = "ThemeToggle"
