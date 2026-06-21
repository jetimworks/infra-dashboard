import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { userApi } from "../api/user"
import { normalizeError } from "../api/errors"
import { qk } from "../lib/query-keys"

export function useUpdateProfile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { first_name: string; last_name: string; phone: string }) =>
      userApi.updateProfile(body),
    onSuccess: (updated) => {
      qc.setQueryData(qk.me(), updated)
      // Persist to localStorage so a refresh shows the new name.
      const stored = localStorage.getItem("user")
      if (stored) {
        try {
          const merged = { ...JSON.parse(stored), ...updated }
          localStorage.setItem("user", JSON.stringify(merged))
        } catch {
          localStorage.setItem("user", JSON.stringify(updated))
        }
      }
      // Re-fetch the canonical user so AuthProvider state stays in sync.
      qc.invalidateQueries({ queryKey: qk.me() })
      toast.success("Profile updated")
    },
    onError: (err) => {
      toast.error(normalizeError(err).message)
    },
  })
}
