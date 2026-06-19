import apiClient from "./client"

export const userApi = {
  getProfile: async () => {
    const response = await apiClient.get("/users/profile")
    return response.data
  },

  updateProfile: async (data: {
    first_name: string
    last_name: string
    phone: string
  }) => {
    const response = await apiClient.put("/users/profile", data)
    return response.data
  },

  changePassword: async (data: {
    current_password: string
    new_password: string
  }) => {
    const response = await apiClient.put("/users/password", data)
    return response.data
  },
}
