import { useState, useRef, useEffect } from "react"
import { Link, useNavigate } from "react-router-dom"
import { Search, Bell, Settings, User, LogOut, X } from "lucide-react"
import { useAuth } from "../../auth/useAuth"

const dummyAlerts = [
  { id: 1, title: "High CPU usage detected", time: "2 min ago", type: "warning" },
  { id: 2, title: "SSL certificate expiring soon", time: "1 hour ago", type: "info" },
  { id: 3, title: "New login from unknown device", time: "3 hours ago", type: "error" },
  { id: 4, title: "Backup completed successfully", time: "5 hours ago", type: "success" },
]

export function Header() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [showNotifications, setShowNotifications] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const notificationsRef = useRef<HTMLDivElement>(null)
  const userMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setShowNotifications(false)
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleLogout = () => {
    logout()
    navigate("/login")
  }

  return (
    <header className="flex items-center justify-between h-16 px-6 border-b border-[var(--border-color)] bg-[var(--header-bg)]">
      {/* Search Bar */}
      <div className="relative w-80">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
        <input
          type="text"
          placeholder="Search..."
          className="w-full h-10 pl-10 pr-4 rounded-lg bg-[var(--input-bg)] border border-[var(--border-color)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent"
        />
      </div>

      {/* Right Side Actions */}
      <div className="flex items-center gap-2">
        {/* Notifications */}
        <div className="relative" ref={notificationsRef}>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors"
          >
            <Bell className="h-5 w-5" />
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-[var(--accent)]"></span>
          </button>

          {showNotifications && (
            <div className="absolute right-0 top-full mt-2 w-80 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-color)] shadow-xl z-50">
              <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-color)]">
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">Notifications</h3>
                <button
                  onClick={() => setShowNotifications(false)}
                  className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <ul className="max-h-80 overflow-y-auto">
                {dummyAlerts.map((alert) => (
                  <li key={alert.id}>
                    <div className="px-4 py-3 hover:bg-[var(--bg-tertiary)] cursor-pointer border-b border-[var(--border-color)] last:border-0">
                      <div className="flex items-start gap-3">
                        <div className={`mt-1 h-2 w-2 rounded-full shrink-0 ${
                          alert.type === "warning" ? "bg-amber-500" :
                          alert.type === "error" ? "bg-red-500" :
                          alert.type === "success" ? "bg-emerald-500" :
                          "bg-blue-500"
                        }`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-[var(--text-primary)] font-medium">{alert.title}</p>
                          <p className="text-xs text-[var(--text-muted)] mt-0.5">{alert.time}</p>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
              <div className="px-4 py-3 border-t border-[var(--border-color)]">
                <button className="text-xs text-[var(--accent)] hover:text-[var(--accent-hover)] font-medium">
                  View all notifications
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Settings */}
        <Link
          to="/settings"
          className="p-2.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors"
        >
          <Settings className="h-5 w-5" />
        </Link>

        {/* User Menu */}
        <div className="relative" ref={userMenuRef}>
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 p-2 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors"
          >
            <div className="h-8 w-8 rounded-full bg-[var(--accent)] flex items-center justify-center text-white text-sm font-medium">
              {user?.first_name?.charAt(0)}{user?.last_name?.charAt(0)}
            </div>
          </button>

          {showUserMenu && (
            <div className="absolute right-0 top-full mt-2 w-56 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-color)] shadow-xl z-50 overflow-hidden">
              <div className="px-4 py-3 border-b border-[var(--border-color)]">
                <p className="text-sm font-medium text-[var(--text-primary)]">{user?.first_name} {user?.last_name}</p>
                <p className="text-xs text-[var(--text-muted)] truncate">{user?.email}</p>
              </div>
              <div className="py-1">
                <Link
                  to="/profile"
                  onClick={() => setShowUserMenu(false)}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors"
                >
                  <User className="h-4 w-4" />
                  Profile
                </Link>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
