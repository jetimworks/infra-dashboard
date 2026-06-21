import { QueryClient } from "@tanstack/react-query"
import { ApiError } from "../api/errors"

/**
 * Central TanStack Query client. Defaults are tuned for an infrastructure
 * dashboard: 30s staleTime so re-mounting during navigation doesn't refetch
 * immediately; retry skipped on 4xx since those are user-fixable; refetch on
 * focus so the user always sees fresh data when returning to the tab.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry: (failureCount, error) => {
        const status = (error as ApiError | undefined)?.status
        if (status && status >= 400 && status < 500) return false
        return failureCount < 2
      },
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 0,
    },
  },
})
