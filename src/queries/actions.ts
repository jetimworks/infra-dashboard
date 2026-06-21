import { useQuery } from "@tanstack/react-query"
import { actionsApi } from "../api/actions"
import { qk } from "../lib/query-keys"
import type { ActionListParams } from "../api/types"

export function useActions(filters?: ActionListParams) {
  return useQuery({
    queryKey: qk.actions(filters),
    queryFn: () => actionsApi.list(filters),
    staleTime: 30_000,
  })
}

export function useInstanceActions(
  instanceId: string | undefined,
  filters?: ActionListParams
) {
  return useQuery({
    queryKey: instanceId
      ? qk.instanceActions(instanceId, filters)
      : ["instances", instanceId, "actions", "noop"],
    queryFn: () => actionsApi.listByInstance(instanceId as string, filters),
    enabled: Boolean(instanceId),
    staleTime: 30_000,
  })
}
