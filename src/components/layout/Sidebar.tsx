import { useState } from "react"
import { Link, useLocation } from "react-router-dom"
import { useAuth } from "../../auth/useAuth"
import { APP_NAME } from "../../config"
import { Button } from "../ui/Button"
import {
  LogOut,
  LayoutDashboard,
  Server,
  Shield,
  FileText,
  Headphones,
  ChevronLeft,
  ChevronRight,
  User,
  Settings,
} from "lucide-react"

const navItems = [
  { path: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { path: "/infrastructure", label: "Infrastructure", icon: Server },
  { path: "/security", label: "Security", icon: Shield },
  { path: "/reports", label: "Reports", icon: FileText },
  { path: "/support", label: "Support", icon: Headphones },
  { path: "/settings", label: "Settings", icon: Settings },
]

export function Sidebar() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const [isCollapsed, setIsCollapsed] = useState(false)

  if (!user) return null

  return (
    <aside
      className={`relative flex flex-col bg-[var(--sidebar-bg)] border-r border-[var(--border-color)] transition-all duration-300 ${
        isCollapsed ? "w-16" : "w-60"
      }`}
    >
      {/* Logo */}
      <div className="flex items-center h-16 px-4 border-b border-[var(--border-color)]">
        <Link to="/dashboard" className="flex items-center gap-3 overflow-hidden">
          <div className="h-8 w-8 rounded-lg bg-[var(--accent)] flex items-center justify-center shrink-0">
            <span className="text-white font-bold text-sm">I</span>
          </div>
          {!isCollapsed && (
            <span className="text-[var(--text-primary)] font-semibold whitespace-nowrap">{APP_NAME}</span>
          )}
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-2">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path
            const Icon = item.icon
            return (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors group ${
                    isActive
                      ? "bg-[var(--accent)] text-white"
                      : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]"
                  }`}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  {!isCollapsed && (
                    <span className="text-sm font-medium whitespace-nowrap">{item.label}</span>
                  )}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* User & Logout */}
      <div className="border-t border-[var(--border-color)] p-2">
        {/* Profile Link */}
        <Link
          to="/profile"
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors mb-1 ${
            location.pathname === "/profile"
              ? "bg-[var(--bg-tertiary)] text-[var(--text-primary)]"
              : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]"
          }`}
        >
          <User className="h-5 w-5 shrink-0" />
          {!isCollapsed && (
            <span className="text-sm font-medium whitespace-nowrap truncate">
              {user.first_name} {user.last_name}
            </span>
          )}
        </Link>

        {/* Logout Button */}
        <Button
          variant="ghost"
          onClick={logout}
          className={`w-full justify-start text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] ${
            isCollapsed ? "px-3" : "px-3"
          }`}
        >
          <LogOut className="h-5 w-5 shrink-0" />
          {!isCollapsed && <span className="ml-3">Logout</span>}
        </Button>
      </div>

      {/* Collapse Toggle */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute top-1/2 -right-3 h-6 w-6 rounded-full bg-[var(--sidebar-bg)] border border-[var(--border-color)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
      >
        {isCollapsed ? (
          <ChevronRight className="h-3.5 w-3.5" />
        ) : (
          <ChevronLeft className="h-3.5 w-3.5" />
        )}
      </button>
    </aside>
  )
}
