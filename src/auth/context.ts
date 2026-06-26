import { createContext } from "react"
import type { User, LoginInput, RegisterInput } from "./types"

interface AuthContextType {
  user: User | null
  isLoading: boolean
  login: (credentials: LoginInput) => Promise<void>
  register: (data: RegisterInput) => Promise<void>
  logout: () => void
  impersonate: (accessToken: string, user: User) => void
  updateProfile: (data: {
    first_name: string
    last_name: string
    phone: string
  }) => Promise<void>
  changePassword: (data: {
    current_password: string
    new_password: string
  }) => Promise<void>
  refreshUser: () => Promise<void>
}

export const AuthContext = createContext<AuthContextType | null>(null)
