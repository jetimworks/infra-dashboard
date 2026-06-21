import { apiGet } from "./client"
import type {
  InstanceMetric,
  InstanceMetricsHistoryParams,
  InstanceMetricsLatest,
} from "./types"

export const metricsApi = {
  latest: (id: string) =>
    apiGet<InstanceMetricsLatest>(`/instances/${id}/metrics/latest`),

  history: (id: string, params: InstanceMetricsHistoryParams) =>
    apiGet<InstanceMetric[]>(`/instances/${id}/metrics/history`, params),
}
