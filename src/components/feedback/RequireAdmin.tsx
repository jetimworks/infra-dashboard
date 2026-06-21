import { useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../../auth/useAuth"
import { toast } from "../ui/Toast"
import { LoadingPage } from "../ui/LoadingState"

export interface RequireAdminProps {
  children: React.ReactNode
}

/**
 * Route guard. Non-staff users are redirected to /dashboard with a toast.
 * Mirrors the existing ProtectedRoute pattern so admins can be wrapped in
 * AppShell or AdminLayout as needed.
 */
export function RequireAdmin({ children }: RequireAdminProps) {
  const { user, isLoading } = useAuth()
  const navigate = useNavigate()
  const toasted = useRef(false)

  useEffect(() => {
    if (isLoading) return
    if (!user) return
    if (!user.is_staff && !toasted.current) {
      toasted.current = true
      toast.error("This area is for administrators only.")
      navigate("/dashboard", { replace: true })
    }
  }, [user, isLoading, navigate])

  if (isLoading || !user) {
    return <LoadingPage label="Checking access…" />
  }
  if (!user.is_staff) {
    return <LoadingPage label="Redirecting…" />
  }
  return <>{children}</>
}

RequireAdmin.displayName = "RequireAdmin"
