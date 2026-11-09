import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { adminApi } from "../api/admin"
import { projectsApi } from "../api/projects"
import { normalizeError } from "../api/errors"
import { qk } from "../lib/query-keys"
import { formatDeletionSummary } from "../lib/utils"
import type {
  AdminCreateUserInput,
  AdminUpdateUserInput,
  ActionListParams,
  User,
} from "../api/types"

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

export function useAdminInstances() {
  return useQuery({
    queryKey: qk.adminInstances(),
    queryFn: () => adminApi.listInstances(),
    staleTime: 30_000,
  })
}

export function useAdminActions(filters?: ActionListParams) {
  return useQuery({
    queryKey: qk.adminActions(filters),
    queryFn: () => adminApi.listActions(filters),
    staleTime: 30_000,
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

export function useDeleteUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => adminApi.deleteUser(id),
    onSuccess: (data, id) => {
      dropUserFromCache(qc, id)
      qc.invalidateQueries({ queryKey: qk.adminUsers() })
      toast.success(formatDeletionSummary(data.user))
    },
    onError: (err, id) => {
      if (isAlreadyDeleted(err)) {
        // The row is gone from the backend already — that is the outcome the
        // admin asked for, not a failure.
        dropUserFromCache(qc, id)
        qc.invalidateQueries({ queryKey: qk.adminUsers() })
        toast.success("User deleted")
        return
      }
      toast.error(normalizeError(err).message)
    },
  })
}

/**
 * True when the delete failed because the user is already gone.
 *
 * A 404 can mean two different things: the backend says "user not found"
 * when the record was already erased, and "route not found" when the
 * endpoint has not been deployed yet. Only the first one is a success.
 */
export function isAlreadyDeleted(err: unknown): boolean {
  const apiError = normalizeError(err)
  if (apiError.status !== 404) return false
  return !apiError.message.toLowerCase().includes("route")
}

/**
 * Take the deleted user out of the cached list straight away, so the row
 * leaves the table without waiting for the refetch to land.
 */
function dropUserFromCache(
  qc: ReturnType<typeof useQueryClient>,
  id: string
) {
  qc.setQueryData<User[]>(qk.adminUsers(), (prev) =>
    prev ? prev.filter((u) => u.id !== id) : prev
  )
}
