import apiClient from "./client"

export const authApi = {
  register: async (data: {
    email: string
    phone: string
    password: string
    first_name: string
    last_name: string
  }) => {
    const response = await apiClient.post("/auth/register", data)
    return response.data
  },

  login: async (data: { email: string; password: string }) => {
    const response = await apiClient.post("/auth/login", data)
    return response.data
  },

  refresh: async (refreshToken: string) => {
    const response = await apiClient.post("/auth/refresh", {
      refresh_token: refreshToken,
    })
    return response.data
  },

  logout: async (accessToken: string, refreshToken: string) => {
    const response = await apiClient.post("/auth/logout", {
      access_token: accessToken,
      refresh_token: refreshToken,
    })
    return response.data
  },
}
