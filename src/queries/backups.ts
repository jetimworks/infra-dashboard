import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { backupsApi } from "../api/backups"
import { normalizeError } from "../api/errors"
import { qk } from "../lib/query-keys"

export function useBackups(id: string | undefined) {
  return useQuery({
    queryKey: id
      ? qk.instanceBackups(id)
      : ["instances", id, "backups", "noop"],
    queryFn: () => backupsApi.list(id as string),
    enabled: Boolean(id),
    staleTime: 30_000,
  })
}

export function useTriggerBackup() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => backupsApi.trigger(id),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: qk.instanceBackups(id) })
    },
    onError: (err) => {
      toast.error(normalizeError(err).message)
    },
  })
}

export function useRestoreBackup() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, filename }: { id: string; filename: string }) =>
      backupsApi.restore(id, filename),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: qk.instanceBackups(vars.id) })
    },
    onError: (err) => {
      toast.error(normalizeError(err).message)
    },
  })
}
