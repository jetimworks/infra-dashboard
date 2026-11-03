import { useState } from "react"
import { Activity, Check, Copy, Gauge, RefreshCw } from "lucide-react"
import { Card, CardHeader, CardTitle } from "../../components/ui/Card"
import { Button } from "../../components/ui/Button"
import { ErrorState } from "../../components/ui/ErrorState"
import { LoadingBlock } from "../../components/ui/LoadingState"
import { PlatformStatusCard } from "../../components/platform/PlatformStatusCard"
import { usePlatformHealth, usePlatformMetrics } from "../../queries/platform"
import { normalizeError } from "../../api/errors"

/**
 * The platform's own state, for staff.
 *
 * Two things live here and they are deliberately separate:
 *
 *   - **Health** is a public probe. It answers for the whole platform, and
 *     it is the same answer the dashboard shows — an operator and an
 *     administrator should never see different verdicts about the same
 *     platform.
 *   - **Metrics** are the Prometheus exposition, and they are admin-only.
 *     The numbers are a hosted platform's customers' infrastructure in
 *     aggregate, so the endpoint is behind the admin middleware and the
 *     text is shown exactly as the server wrote it.
 */
export function AdminPlatformPage() {
  const healthQ = usePlatformHealth()
  const metricsQ = usePlatformMetrics()

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-[1.5rem] font-bold leading-tight text-fg tracking-tight xs:text-[1.625rem] sm:text-[1.75rem]">
          Platform
        </h1>
        <p className="mt-1 text-[0.9375rem] text-fg-muted">
          The state of the platform itself — the database, the cache, and the
          metrics the platform exports about itself.
        </p>
      </header>

      <PlatformStatusCard
        health={healthQ.data}
        loading={healthQ.isLoading}
        refreshing={healthQ.isFetching}
        error={healthQ.isError ? normalizeError(healthQ.error) : null}
        onRefresh={() => void healthQ.refetch()}
      />

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Gauge className="h-4 w-4 text-fg-muted" aria-hidden />
            <CardTitle>Metrics</CardTitle>
          </div>
          <Button
            variant="ghost"
            size="sm"
            leftIcon={RefreshCw}
            isLoading={metricsQ.isFetching}
            onClick={() => void metricsQ.refetch()}
          >
            Refresh
          </Button>
        </CardHeader>

        <p className="-mt-2 mb-4 text-sm text-fg-muted">
          The Prometheus exposition served at <code className="rounded bg-surface-sunken px-1 py-0.5 font-mono text-[0.8125rem]">/metrics</code>.
          It is shown exactly as the server wrote it — this is the text a
          scrape would receive.
        </p>

        {metricsQ.isLoading ? (
          <LoadingBlock label="Reading the metrics…" className="py-8" />
        ) : metricsQ.isError ? (
          <ErrorState
            title="We couldn't read the metrics"
            description={normalizeError(metricsQ.error).message}
            onRetry={() => void metricsQ.refetch()}
            className="py-8"
          />
        ) : (
          <MetricsBlock text={metricsQ.data ?? ""} />
        )}
      </Card>
    </div>
  )
}

AdminPlatformPage.displayName = "AdminPlatformPage"

/**
 * The exposition text.
 *
 * Never parsed, never reformatted. A Prometheus scrape reads the bytes as
 * they are, so the viewer shows the bytes as they are — an operator
 * comparing what the dashboard shows with what the scraper collects should
 * not find a difference.
 */
function MetricsBlock({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    if (!text) return
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    } catch {
      // Clipboard access can be refused. Nothing is broken — the text is on
      // screen to select.
    }
  }

  const lines = text.split("\n")
  const metricCount = lines.filter((line) => line.startsWith("#")).length

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="inline-flex items-center gap-1.5 text-xs text-fg-subtle">
          <Activity className="h-3 w-3" aria-hidden />
          {metricCount} metric{metricCount === 1 ? "" : "s"} ·{" "}
          {lines.length} line{lines.length === 1 ? "" : "s"}
        </p>
        {text ? (
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs text-fg-subtle transition-colors hover:bg-surface-sunken hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            aria-label={copied ? "Copied" : "Copy metrics"}
          >
            {copied ? (
              <>
                <Check className="h-3 w-3 text-success-fg" aria-hidden />
                <span className="text-success-fg">Copied</span>
              </>
            ) : (
              <>
                <Copy className="h-3 w-3" aria-hidden />
                <span>Copy</span>
              </>
            )}
          </button>
        ) : null}
      </div>

      <pre className="max-h-[32rem] overflow-auto whitespace-pre-wrap break-words rounded-md border border-border/40 bg-surface-sunken p-3 font-mono text-[0.6875rem] leading-relaxed text-fg">
        {text || "(no metrics returned)"}
      </pre>
    </div>
  )
}
