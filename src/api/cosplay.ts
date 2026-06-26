import apiClient from "./client"

export interface CosplayResponse {
  access_token: string
  token_type: string
  expires_in: number
}

export const cosplayApi = {
  impersonate: async (email: string): Promise<CosplayResponse> => {
    const response = await apiClient.post<CosplayResponse>("/admin/cosplay", { email })
    return response.data
  },
}
