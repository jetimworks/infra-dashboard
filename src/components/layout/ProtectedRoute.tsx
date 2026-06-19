import { Navigate, Outlet, useLocation } from "react-router-dom"
import { useAuth } from "../../auth/useAuth"
import { Spinner } from "../ui/Spinner"

export function ProtectedRoute() {
  const { user, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spinner />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // If user needs to change password (onboarding), redirect to change-password
  if (user.onboarding_stage === "CHANGE_PASSWORD" && location.pathname !== "/change-password") {
    return <Navigate to="/change-password" state={{ from: location }} replace />
  }

  // If user is past onboarding and on change-password page, redirect away
  if (user.onboarding_stage === "HOME" && location.pathname === "/change-password") {
    return <Navigate to="/dashboard" replace />
  }

  return <Outlet />
}

// PublicRoute: redirects logged-in users to dashboard
export function PublicRoute() {
  const { user, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spinner />
      </div>
    )
  }

  if (user) {
    const from = (location.state as { from?: Location })?.from?.pathname || "/dashboard"
    return <Navigate to={from} replace />
  }

  return <Outlet />
}
