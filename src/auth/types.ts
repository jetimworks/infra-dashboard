export type User = {
  id: string
  email: string
  phone: string
  first_name: string
  last_name: string
  status: string
  is_staff: boolean
  is_verified: boolean
  onboarding_stage: "CHANGE_PASSWORD" | "HOME" | null
  last_logged_in: string | null
  created_at: string
}

export type Tokens = {
  access_token: string
  refresh_token: string
}

export type LoginInput = {
  email: string
  password: string
}

export type RegisterInput = {
  email: string
  phone: string
  password: string
  first_name: string
  last_name: string
}
