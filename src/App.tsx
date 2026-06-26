import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { useEffect } from "react"
import { Toaster } from "sonner"
import { AuthProvider } from "./auth/AuthProvider"
import { ThemeProvider } from "./contexts/ThemeContext"
import { PublicRoute, ProtectedRoute } from "./components/layout/ProtectedRoute"
import { AppShell } from "./components/layout/AppShell"
import { AdminRoute } from "./components/auth/AdminRoute"
import { AdminShell } from "./components/layout/AdminShell"

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

import { AdminDashboardPage } from "./pages/admin/AdminDashboardPage"
import { AdminUsersPage } from "./pages/admin/AdminUsersPage"
import { AdminProjectsPage } from "./pages/admin/AdminProjectsPage"
import { AdminProjectDetailPage } from "./pages/admin/AdminProjectDetailPage"
import { AdminUserDetailPage } from "./pages/admin/AdminUserDetailPage"
import { AdminActivityPage } from "./pages/admin/AdminActivityPage"
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
              </Route>

              {/* Admin routes — rendered in AdminShell, guarded by AdminRoute */}
              <Route element={<AdminRoute />}>
                <Route element={<AdminShell />}>
                  <Route path="/admin" element={<AdminDashboardPage />} />
                  <Route path="/admin/users" element={<AdminUsersPage />} />
                  <Route path="/admin/users/:id" element={<AdminUserDetailPage />} />
                  <Route path="/admin/projects" element={<AdminProjectsPage />} />
                  <Route path="/admin/projects/:id" element={<AdminProjectDetailPage />} />
                  <Route
                    path="/admin/instances"
                    element={<AdminInstancesListPage />}
                  />
                  <Route
                    path="/admin/instances/new"
                    element={<AdminInstanceCreatePage />}
                  />
                  <Route
                    path="/admin/instances/:id/edit"
                    element={<AdminInstanceEditPage />}
                  />
                  <Route
                    path="/admin/instances/:id/ssh-key"
                    element={<AdminInstanceSshKeyPage />}
                  />
                  <Route
                    path="/admin/instances/:id/system-action"
                    element={<AdminInstanceSystemActionPage />}
                  />
                  <Route
                    path="/admin/security-audits"
                    element={<AdminSecurityAuditsPage />}
                  />
                  <Route
                    path="/admin/action-requests"
                    element={<AdminActionRequestsPage />}
                  />
                  <Route
                    path="/admin/action-requests/:id"
                    element={<AdminActionRequestDetailPage />}
                  />
                  <Route
                    path="/admin/activity"
                    element={<AdminActivityPage />}
                  />
                </Route>
              </Route>

              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Routes>
        </ThemeProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
