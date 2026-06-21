import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { sslApi } from "../api/ssl"
import { normalizeError } from "../api/errors"
import { qk } from "../lib/query-keys"

export function useRenewSsl() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => sslApi.renew(id),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: qk.instanceSecurityCheck(id) })
      qc.invalidateQueries({ queryKey: qk.instanceSecurityAudit(id) })
    },
    onError: (err) => {
      toast.error(normalizeError(err).message)
    },
  })
}
