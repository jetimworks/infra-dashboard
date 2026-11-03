import { useQuery } from "@tanstack/react-query"
import { platformApi } from "../api/platform"
import { qk } from "../lib/query-keys"

/**
 * The platform's own health.
 *
 * The endpoint is public and answers HTTP 503 with `status: "degraded"` when
 * the database or redis is unreachable. The API module accepts that 503 as a
 * valid answer, so this query never enters an error state for a degraded
 * platform — the page branches on `data.status` instead. A degraded platform
 * is information, not a broken dashboard.
 *
 * The poll is once a minute. The card sits on the dashboard, so it should
 * keep up with reality, but a platform going down is not a per-second event.
 */
export function usePlatformHealth() {
  return useQuery({
    queryKey: qk.platformHealth(),
    queryFn: () => platformApi.health(),
    staleTime: 30_000,
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
  })
}

/**
 * The Prometheus exposition text.
 *
 * Admin-only, and fetched when the admin opens the platform page — that is
 * the one page that exists to show it. It is never polled: the exposition
 * changes on every scrape, and nobody reads it twice a minute on purpose.
 * `retry: false` because a 403 is an answer, not a blip, and the global
 * client would otherwise retry it twice.
 */
export function usePlatformMetrics() {
  return useQuery({
    queryKey: qk.platformMetrics(),
    queryFn: () => platformApi.metrics(),
    staleTime: 60_000,
    retry: false,
  })
}
