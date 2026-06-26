import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom"
import { useEffect } from "react"
import { AnimatePresence } from "framer-motion"
import { Toaster } from "sonner"
import { AuthProvider } from "./auth/AuthProvider"
import { ThemeProvider } from "./contexts/ThemeContext"
import { PublicRoute, ProtectedRoute } from "./components/layout/ProtectedRoute"
import { AppShell } from "./components/layout/AppShell"
import { AdminRoute, CosplayRoute } from "./components/auth/AdminRoute"
import { AdminShell } from "./components/layout/AdminShell"
import { PageWrapper } from "./components/layout/PageWrapper"

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
import { CosplayPage } from "./pages/Cosplay"

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
          <AnimatedRoutes />
        </ThemeProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

/**
 * Wraps the route tree in <AnimatePresence> and forces a remount on every
 * path change so that each route's <PageWrapper> can play its enter/exit
 * animation. mode="wait" ensures the exit animation finishes before the
 * next page enters.
 */
function AnimatedRoutes() {
  const location = useLocation()
  return (
    <AnimatePresence mode="wait" initial={false}>
      <Routes location={location} key={location.pathname}>
        {/* Public */}
        <Route element={<PublicRoute />}>
          <Route path="/login" element={<PageWrapper><LoginPage /></PageWrapper>} />
          <Route path="/register" element={<PageWrapper><RegisterPage /></PageWrapper>} />
          <Route path="/forgot-password" element={<PageWrapper><ForgotPasswordPage /></PageWrapper>} />
        </Route>

        {/* Protected (any authed user) */}
        <Route element={<ProtectedRoute />}>
          <Route element={<AppShell />}>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<PageWrapper><DashboardPage /></PageWrapper>} />
            <Route path="/instances" element={<PageWrapper><InstancesListPage /></PageWrapper>} />
            <Route path="/projects/:id" element={<PageWrapper><ProjectDetailPage /></PageWrapper>} />
            <Route path="/instances/:id" element={<PageWrapper><InstanceDetailPage /></PageWrapper>} />
            <Route
              path="/instances/:id/metrics"
              element={<PageWrapper><InstanceMetricsPage /></PageWrapper>}
            />
            <Route
              path="/instances/:id/security"
              element={<PageWrapper><InstanceSecurityPage /></PageWrapper>}
            />
            <Route
              path="/instances/:id/backups"
              element={<PageWrapper><InstanceBackupsPage /></PageWrapper>}
            />
            <Route path="/activity" element={<PageWrapper><ActivityPage /></PageWrapper>} />
            <Route path="/account" element={<PageWrapper><AccountPage /></PageWrapper>} />
            <Route path="/support" element={<PageWrapper><SupportPage /></PageWrapper>} />
            <Route path="/change-password" element={<PageWrapper><ChangePasswordPage /></PageWrapper>} />
            <Route path="/action-requests" element={<PageWrapper><ActionRequestsPage /></PageWrapper>} />
            <Route path="/action-requests/:id" element={<PageWrapper><ActionRequestDetailPage /></PageWrapper>} />
          </Route>

          {/* Admin routes — rendered in AdminShell, guarded by AdminRoute */}
          <Route element={<AdminRoute />}>
            <Route element={<AdminShell />}>
              <Route path="/admin" element={<PageWrapper><AdminDashboardPage /></PageWrapper>} />
              <Route path="/admin/users" element={<PageWrapper><AdminUsersPage /></PageWrapper>} />
              <Route path="/admin/users/:id" element={<PageWrapper><AdminUserDetailPage /></PageWrapper>} />
              <Route path="/admin/projects" element={<PageWrapper><AdminProjectsPage /></PageWrapper>} />
              <Route path="/admin/projects/:id" element={<PageWrapper><AdminProjectDetailPage /></PageWrapper>} />
              <Route
                path="/admin/instances"
                element={<PageWrapper><AdminInstancesListPage /></PageWrapper>}
              />
              <Route
                path="/admin/instances/new"
                element={<PageWrapper><AdminInstanceCreatePage /></PageWrapper>}
              />
              <Route
                path="/admin/instances/:id/edit"
                element={<PageWrapper><AdminInstanceEditPage /></PageWrapper>}
              />
              <Route
                path="/admin/instances/:id/ssh-key"
                element={<PageWrapper><AdminInstanceSshKeyPage /></PageWrapper>}
              />
              <Route
                path="/admin/instances/:id/system-action"
                element={<PageWrapper><AdminInstanceSystemActionPage /></PageWrapper>}
              />
              <Route
                path="/admin/security-audits"
                element={<PageWrapper><AdminSecurityAuditsPage /></PageWrapper>}
              />
              <Route
                path="/admin/action-requests"
                element={<PageWrapper><AdminActionRequestsPage /></PageWrapper>}
              />
              <Route
                path="/admin/action-requests/:id"
                element={<PageWrapper><AdminActionRequestDetailPage /></PageWrapper>}
              />
              <Route
                path="/admin/activity"
                element={<PageWrapper><AdminActivityPage /></PageWrapper>}
              />
            </Route>
          </Route>

          {/* Cosplay — standalone admin-only page (no AdminShell) */}
          <Route
            path="/cosplay"
            element={
              <CosplayRoute>
                <PageWrapper><CosplayPage /></PageWrapper>
              </CosplayRoute>
            }
          />

          <Route path="*" element={<PageWrapper><NotFoundPage /></PageWrapper>} />
        </Route>
      </Routes>
    </AnimatePresence>
  )
}
