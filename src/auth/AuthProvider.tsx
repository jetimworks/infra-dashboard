import {
  useCallback,
  useEffect,
  useState,
  type ReactNode,
} from "react"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"
import { authApi } from "../api/auth"
import { userApi } from "../api/user"
import { setAccessToken, getAccessToken } from "../api/client"
import { AuthContext } from "./context"
import type { User, LoginInput, RegisterInput } from "./types"

export function AuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const [user, setUser] = useState<User | null>(() => {
    // Initialize from localStorage synchronously
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("user")
      return stored ? JSON.parse(stored) : null
    }
    return null
  })
  const [isLoading, setIsLoading] = useState(true)

  // Hydrate from localStorage on mount - only if we have a stored user
  useEffect(() => {
    const refreshToken = localStorage.getItem("rt")
    const storedUser = localStorage.getItem("user")

    if (!refreshToken || !storedUser) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsLoading(false)
      return
    }

    // Immediately validate the refresh token
    authApi
      .refresh(refreshToken)
      .then((data: { access_token: string; refresh_token: string }) => {
        setAccessToken(data.access_token)
        // Persist the new refresh token (single-use)
        localStorage.setItem("rt", data.refresh_token)
        // Re-fetch user profile with new access token
        return userApi.getProfile()
      })
      .then((userData: User) => {
        setUser(userData)
        localStorage.setItem("user", JSON.stringify(userData))
      })
      .catch(() => {
        // Refresh failed - clear storage
        localStorage.removeItem("rt")
        localStorage.removeItem("user")
        setAccessToken(null)
        setUser(null)
      })
      .finally(() => {
        setIsLoading(false)
      })
  }, [])

  const login = useCallback(
    async (credentials: LoginInput) => {
      const data = await authApi.login(credentials)
      const { access_token, refresh_token, user: userData } = data

      setAccessToken(access_token)
      localStorage.setItem("rt", refresh_token)
      localStorage.setItem("user", JSON.stringify(userData))
      setUser(userData)

      // Redirect based on onboarding stage and staff status
      if (userData.onboarding_stage === "CHANGE_PASSWORD") {
        navigate("/change-password", { replace: true })
      } else if (userData.is_staff) {
        navigate("/admin", { replace: true })
      } else {
        navigate("/dashboard", { replace: true })
      }
    },
    [navigate]
  )

  const register = useCallback(
    async (data: RegisterInput) => {
      await authApi.register(data)
      // After register, auto-login
      await login({ email: data.email, password: data.password })
    },
    [login]
  )

  const logout = useCallback(() => {
    const accessToken = getAccessToken()
    const refreshToken = localStorage.getItem("rt")

    // Fire-and-forget logout call
    if (accessToken && refreshToken) {
      authApi.logout(accessToken, refreshToken).catch(() => {
        // Swallow errors - logout should not block
      })
    }

    // Clear storage regardless
    localStorage.removeItem("rt")
    localStorage.removeItem("user")
    setAccessToken(null)
    setUser(null)

    navigate("/login", { replace: true })
  }, [navigate])

  const impersonate = useCallback(
    (accessToken: string, userData: User) => {
      // Set access token in memory (no localStorage — this is a temporary session)
      setAccessToken(accessToken)
      // Set user in state (no localStorage persistence)
      setUser(userData)
      // Navigate to dashboard as the impersonated user
      navigate("/dashboard", { replace: true })
    },
    [navigate]
  )

  const updateProfile = useCallback(
    async (data: { first_name: string; last_name: string; phone: string }) => {
      const updatedUser = await userApi.updateProfile(data)
      setUser(updatedUser)
      localStorage.setItem("user", JSON.stringify(updatedUser))
      toast.success("Profile updated successfully")
    },
    []
  )

  const changePassword = useCallback(
    async (data: { current_password: string; new_password: string }) => {
      await userApi.changePassword(data)
      toast.success("Password changed successfully")
    },
    []
  )

  const refreshUser = useCallback(async () => {
    const userData = await userApi.getProfile()
    setUser(userData)
    localStorage.setItem("user", JSON.stringify(userData))
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        register,
        logout,
        impersonate,
        updateProfile,
        changePassword,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
