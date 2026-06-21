import { useQuery } from "@tanstack/react-query"
import { metricsApi } from "../api/metrics"
import { qk } from "../lib/query-keys"
import type { InstanceMetricsHistoryParams } from "../api/types"

/**
 * Polls the latest metrics every 60s. Stale 20s so a remount within 20s
 * doesn't refetch.
 */
export function useInstanceMetricsLatest(id: string | undefined) {
  return useQuery({
    queryKey: id
      ? qk.instanceMetricsLatest(id)
      : ["instances", id, "metrics", "latest", "noop"],
    queryFn: () => metricsApi.latest(id as string),
    enabled: Boolean(id),
    staleTime: 20_000,
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
  })
}

export function useInstanceMetricsHistory(
  id: string | undefined,
  params: InstanceMetricsHistoryParams
) {
  return useQuery({
    queryKey: id
      ? qk.instanceMetricsHistory(id, params.metric, params.from, params.to)
      : ["instances", id, "metrics", "history", "noop"],
    queryFn: () => metricsApi.history(id as string, params),
    enabled: Boolean(id && params.metric),
    staleTime: 5 * 60_000,
  })
}
