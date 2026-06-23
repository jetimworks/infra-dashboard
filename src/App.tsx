import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom"
import { useEffect } from "react"
import { Toaster } from "sonner"
import { AuthProvider } from "./auth/AuthProvider"
import { ThemeProvider } from "./contexts/ThemeContext"
import { PublicRoute, ProtectedRoute } from "./components/layout/ProtectedRoute"
import { AppShell } from "./components/layout/AppShell"
import { RequireAdmin } from "./components/feedback/RequireAdmin"

import { LoginPage } from "./pages/Login"
import { RegisterPage } from "./pages/Register"
import { ForgotPasswordPage } from "./pages/ForgotPassword"
import { ChangePasswordPage } from "./pages/ChangePassword"

import { DashboardPage } from "./pages/Dashboard"
import { ProjectDetailPage } from "./pages/ProjectDetailPage"
import { InstancesListPage } from "./pages/InstancesListPage"
import { InstanceDetailPage } from "./pages/InstanceDetailPage"
import { InstanceMetricsPage } from "./pages/InstanceMetricsPage"
import { InstanceSecurityPage } from "./pages/InstanceSecurityPage"
import { InstanceBackupsPage } from "./pages/InstanceBackupsPage"
import { ActivityPage } from "./pages/ActivityPage"
import { AccountPage } from "./pages/AccountPage"
import { SupportPage } from "./pages/SupportPage"
import { NotFoundPage } from "./pages/NotFoundPage"
import { ActionRequestsPage } from "./pages/ActionRequestsPage"
import { ActionRequestDetailPage } from "./pages/ActionRequestDetailPage"

import { AdminOverviewPage } from "./pages/admin/AdminOverviewPage"
import { AdminUsersPage } from "./pages/admin/AdminUsersPage"
import { AdminProjectsPage } from "./pages/admin/AdminProjectsPage"
import { AdminInstancesListPage } from "./pages/admin/AdminInstancesListPage"
import { AdminInstanceCreatePage } from "./pages/admin/AdminInstanceCreatePage"
import { AdminInstanceEditPage } from "./pages/admin/AdminInstanceEditPage"
import { AdminInstanceSshKeyPage } from "./pages/admin/AdminInstanceSshKeyPage"
import { AdminInstanceSystemActionPage } from "./pages/admin/AdminInstanceSystemActionPage"
import { AdminSecurityAuditsPage } from "./pages/admin/AdminSecurityAuditsPage"
import { AdminActionRequestsPage } from "./pages/admin/AdminActionRequestsPage"
import { AdminActionRequestDetailPage } from "./pages/admin/AdminActionRequestDetailPage"

export default function App() {
  // Always use vibrant mode - remove old color mode preferences
  useEffect(() => {
    document.documentElement.classList.add("vibrant")
    localStorage.removeItem("colorMode")
    localStorage.removeItem("colorModePopupShown")
  }, [])

  return (
    <BrowserRouter>
      <AuthProvider>
        <ThemeProvider>
          <Toaster
            richColors
            position="top-right"
            closeButton
            toastOptions={{
              duration: 5000,
            }}
          />
          <Routes>
            {/* Public */}
            <Route element={<PublicRoute />}>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            </Route>

            {/* Protected (any authed user) */}
            <Route element={<ProtectedRoute />}>
              <Route element={<AppShell />}>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/instances" element={<InstancesListPage />} />
                <Route path="/projects/:id" element={<ProjectDetailPage />} />
                <Route path="/instances/:id" element={<InstanceDetailPage />} />
                <Route
                  path="/instances/:id/metrics"
                  element={<InstanceMetricsPage />}
                />
                <Route
                  path="/instances/:id/security"
                  element={<InstanceSecurityPage />}
                />
                <Route
                  path="/instances/:id/backups"
                  element={<InstanceBackupsPage />}
                />
                <Route path="/activity" element={<ActivityPage />} />
                <Route path="/account" element={<AccountPage />} />
                <Route path="/support" element={<SupportPage />} />
                <Route path="/change-password" element={<ChangePasswordPage />} />
                <Route path="/action-requests" element={<ActionRequestsPage />} />
                <Route path="/action-requests/:id" element={<ActionRequestDetailPage />} />

                {/* Admin (gated). Renders inside the same AppShell as
                    every other page — admin uses in-page tabs for
                    sub-navigation instead of a separate header strip. */}
                <Route
                  path="/admin"
                  element={<RequireAdmin><Outlet /></RequireAdmin>}
                >
                  <Route index element={<AdminOverviewPage />} />
                  <Route path="users" element={<AdminUsersPage />} />
                  <Route path="projects" element={<AdminProjectsPage />} />
                  <Route
                    path="instances"
                    element={<AdminInstancesListPage />}
                  />
                  <Route
                    path="instances/new"
                    element={<AdminInstanceCreatePage />}
                  />
                  <Route
                    path="instances/:id/edit"
                    element={<AdminInstanceEditPage />}
                  />
                  <Route
                    path="instances/:id/ssh-key"
                    element={<AdminInstanceSshKeyPage />}
                  />
                  <Route
                    path="instances/:id/system-action"
                    element={<AdminInstanceSystemActionPage />}
                  />
                  <Route
                    path="security-audits"
                    element={<AdminSecurityAuditsPage />}
                  />
                  <Route
                    path="action-requests"
                    element={<AdminActionRequestsPage />}
                  />
                  <Route
                    path="action-requests/:id"
                    element={<AdminActionRequestDetailPage />}
                  />
                </Route>

                <Route path="*" element={<NotFoundPage />} />
              </Route>
            </Route>
          </Routes>
        </ThemeProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
