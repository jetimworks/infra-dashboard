import { Moon, Sun } from "lucide-react"
import { useTheme } from "../../hooks/useTheme"
import { Button } from "../ui/Button"

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleTheme}
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
    >
      {theme === "dark" ? (
        <Sun className="h-4 w-4" aria-hidden />
      ) : (
        <Moon className="h-4 w-4" aria-hidden />
      )}
    </Button>
  )
}

ThemeToggle.displayName = "ThemeToggle"
