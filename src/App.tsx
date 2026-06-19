import { BrowserRouter, Routes, Route } from "react-router-dom"
import { AuthProvider } from "./auth/AuthProvider"
import { ThemeProvider } from "./contexts/ThemeContext"
import { PublicRoute, ProtectedRoute } from "./components/layout/ProtectedRoute"
import { DashboardLayout } from "./components/layout/DashboardLayout"
import { LoginPage } from "./pages/Login"
import { RegisterPage } from "./pages/Register"
import { DashboardPage } from "./pages/Dashboard"
import { InfrastructurePage } from "./pages/Infrastructure"
import { SecurityPage } from "./pages/Security"
import { ReportsPage } from "./pages/Reports"
import { SupportPage } from "./pages/Support"
import { ProfilePage } from "./pages/Profile"
import { SettingsPage } from "./pages/Settings"
import { ChangePasswordPage } from "./pages/ChangePassword"

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ThemeProvider>
          <Routes>
            <Route element={<PublicRoute />}>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
            </Route>
            <Route element={<ProtectedRoute />}>
              <Route element={<DashboardLayout />}>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/infrastructure" element={<InfrastructurePage />} />
                <Route path="/security" element={<SecurityPage />} />
                <Route path="/reports" element={<ReportsPage />} />
                <Route path="/support" element={<SupportPage />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/change-password" element={<ChangePasswordPage />} />
              </Route>
            </Route>
          </Routes>
        </ThemeProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
