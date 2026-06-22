import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios"

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8080"

// Module-level access token (memory only - never localStorage)
let accessToken: string | null = null

// For deduping concurrent refresh requests
let refreshPromise: Promise<string> | null = null

// Request queue for requests waiting during token refresh
type Resolver = (token: string) => void
const requestQueue: Resolver[] = []

export const setAccessToken = (token: string | null) => {
  accessToken = token
}

export const getAccessToken = () => accessToken

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
})

// Request interceptor: attach Authorization header
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor: handle 401 with refresh flow
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean }

    // Only handle 401 errors
    if (error.response?.status !== 401) {
      return Promise.reject(error)
    }

    // Avoid infinite loops
    if (originalRequest._retry) {
      return Promise.reject(error)
    }

    // FIX: Skip refresh logic for the login endpoint itself
    if (originalRequest.url?.includes("/auth/login")) {
      return Promise.reject(error)
    }

    originalRequest._retry = true

    // If no refresh token in localStorage, we can't refresh
    const refreshToken = localStorage.getItem("rt")
    if (!refreshToken) {
      // Clear everything and redirect to login
      localStorage.removeItem("rt")
      localStorage.removeItem("user")
      setAccessToken(null)
      window.location.href = "/login"
      return Promise.reject(error)
    }

    try {
      // If refresh is already in flight, wait for it
      if (refreshPromise) {
        const newToken = await refreshPromise
        originalRequest.headers.Authorization = `Bearer ${newToken}`
        return apiClient(originalRequest)
      }

      // Start new refresh
      refreshPromise = performRefresh(refreshToken)
      const newToken = await refreshPromise
      refreshPromise = null

      // Resolve all queued requests with the new token
      requestQueue.forEach((resolver) => resolver(newToken))
      requestQueue.length = 0

      // Retry original request
      originalRequest.headers.Authorization = `Bearer ${newToken}`
      return apiClient(originalRequest)
    } catch (refreshError) {
      refreshPromise = null
      // Refresh failed - clear everything and redirect
      localStorage.removeItem("rt")
      localStorage.removeItem("user")
      setAccessToken(null)
      window.location.href = "/login"
      return Promise.reject(refreshError)
    }
  }
)

async function performRefresh(refreshToken: string): Promise<string> {
  const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
    refresh_token: refreshToken,
  })
  const { access_token, refresh_token } = response.data

  // Update memory
  setAccessToken(access_token)

  // Update localStorage with NEW refresh token (single-use)
  localStorage.setItem("rt", refresh_token)

  return access_token
}

export default apiClient

// ──────────────────────────────────────────────────────────────────────────
// Typed helpers used by every API module and by TanStack Query queryFns.
// The axios interceptor above (auth, refresh, 401 retry) applies transparently.
// ──────────────────────────────────────────────────────────────────────────

export async function apiGet<T>(
  url: string,
  params?: object
): Promise<T> {
  const snakeParams = params
    ? Object.fromEntries(
        Object.entries(params).map(([k, v]) => [k.replace(/([A-Z])/g, "_$1").toLowerCase(), v])
      )
    : undefined
  const res = await apiClient.get<T>(url, { params: snakeParams })
  return res.data
}

export async function apiPost<T, B = unknown>(
  url: string,
  body?: B
): Promise<T> {
  const res = await apiClient.post<T>(url, body)
  return res.data
}

export async function apiPut<T, B = unknown>(
  url: string,
  body?: B
): Promise<T> {
  const res = await apiClient.put<T>(url, body)
  return res.data
}

export async function apiPatch<T, B = unknown>(
  url: string,
  body?: B
): Promise<T> {
  const res = await apiClient.patch<T>(url, body)
  return res.data
}

export async function apiDelete<T>(url: string): Promise<T> {
  const res = await apiClient.delete<T>(url)
  return res.data
}
