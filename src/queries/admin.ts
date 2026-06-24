import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { adminApi } from "../api/admin"
import { projectsApi } from "../api/projects"
import { normalizeError } from "../api/errors"
import { qk } from "../lib/query-keys"
import type { AdminCreateUserInput, AdminUpdateUserInput } from "../api/types"

export function useAdminUsers() {
  return useQuery({
    queryKey: qk.adminUsers(),
    queryFn: () => adminApi.listUsers(),
    staleTime: 60_000,
  })
}

export function useAdminProjects() {
  return useQuery({
    queryKey: qk.adminProjects(),
    queryFn: () => projectsApi.listAdmin(),
    staleTime: 60_000,
  })
}

export function useCreateUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: AdminCreateUserInput) => adminApi.createUser(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.adminUsers() })
      toast.success("User created")
    },
    onError: (err) => {
      toast.error(normalizeError(err).message)
    },
  })
}

export function useUpdateUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: AdminUpdateUserInput }) =>
      adminApi.updateUser(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.adminUsers() })
      qc.invalidateQueries({ queryKey: qk.me() })
      toast.success("User updated")
    },
    onError: (err) => {
      toast.error(normalizeError(err).message)
    },
  })
}
