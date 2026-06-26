import { Navigate, Outlet } from "react-router-dom"
import { useAuth } from "../../auth/useAuth"
import { Spinner } from "../ui/Spinner"
import { toast } from "sonner"

/**
 * Route guard for admin-only routes.
 * Non-staff users are redirected to /dashboard with a toast.
 * Mirrors the ProtectedRoute pattern.
 */
export function AdminRoute() {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spinner />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (!user.is_staff) {
    toast.error("This area is for administrators only.")
    return <Navigate to="/dashboard" replace />
  }

  return <Outlet />
}
