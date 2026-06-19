import { Link } from "react-router-dom"
import { useAuth } from "../../auth/useAuth"
import { APP_NAME } from "../../config"
import { Button } from "../ui/Button"
import { LogOut, LayoutDashboard, Server, Shield, FileText, Headphones } from "lucide-react"

export function Navbar() {
  const { user, logout } = useAuth()
  if (!user) return null

  return (
    <nav className="border-b border-gray-200 bg-white px-6 py-4 shadow-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between">
        <Link to="/dashboard" className="text-xl font-bold text-gray-900 hover:text-blue-600">
          {APP_NAME}
        </Link>
        <div className="flex items-center gap-6">
          <Link to="/dashboard" className="flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-blue-600">
            <LayoutDashboard className="h-4 w-4" /> Overview
          </Link>
          <Link to="/infrastructure" className="flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-blue-600">
            <Server className="h-4 w-4" /> Infrastructure
          </Link>
          <Link to="/security" className="flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-blue-600">
            <Shield className="h-4 w-4" /> Security
          </Link>
          <Link to="/reports" className="flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-blue-600">
            <FileText className="h-4 w-4" /> Reports
          </Link>
          <Link to="/support" className="flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-blue-600">
            <Headphones className="h-4 w-4" /> Support
          </Link>
          <div className="h-6 w-px bg-gray-200"></div>
          <Button variant="ghost" size="sm" onClick={logout} className="flex items-center gap-1 text-gray-600">
            <LogOut className="h-4 w-4" /> Logout
          </Button>
        </div>
      </div>
    </nav>
  )
}
