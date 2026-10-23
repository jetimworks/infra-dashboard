import { useEffect, useMemo, useRef, useState } from "react"
import { Link, useParams } from "react-router-dom"
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Clock,
  Copy,
  Lightbulb,
  Loader2,
  Rocket,
  Server,
  ShieldAlert,
  Terminal,
  XCircle,
  type LucideIcon,
} from "lucide-react"
import { motion, useReducedMotion } from "framer-motion"
import { Card, CardHeader, CardTitle } from "../components/ui/Card"
import { Button } from "../components/ui/Button"
import { LoadingPage } from "../components/ui/LoadingState"
import { ErrorState } from "../components/ui/ErrorState"
import { EmptyState } from "../components/ui/EmptyState"
import { ConfirmDialog } from "../components/ui/ConfirmDialog"
import { ActionTimelineItem } from "../components/data/ActionTimelineItem"
import { useDeployApp, useInstance } from "../queries/instances"
import { useInstanceActions } from "../queries/actions"
import { normalizeError } from "../api/errors"
import { cn, formatRelative, formatDuration } from "../lib/utils"
import { pageVariants, reducedVariants } from "../lib/motion"
import type { Action, DeployAppResponse, DeployAppStatus, InstanceType } from "../api/types"

const typeLabel: Record<InstanceType, string> = {
  VPS: "Server",
  RDS: "Database",
  REMOTE_RDS: "Remote database",
  REDIS: "Cache",
  STORAGE: "Storage",
}

const SCRIPT_NOT_FOUND_PREFIX = "deploy.sh not found at"

const bannerStyle: Record<
  DeployAppStatus,
  { bg: string; fg: string; ring: string; Icon: LucideIcon; headline: string }
> = {
  SUCCESS: {
    bg: "bg-success-soft",
    fg: "text-success-fg",
    ring: "ring-success/25",
    Icon: CheckCircle2,
    headline: "Deployment succeeded",
  },
  FAIL: {
    bg: "bg-danger-soft",
    fg: "text-danger-fg",
    ring: "ring-danger/25",
    Icon: XCircle,
    headline: "Deployment failed",
  },
  UNKNOWN: {
    bg: "bg-warning-soft",
    fg: "text-warning-fg",
    ring: "ring-warning/30",
    Icon: AlertTriangle,
    headline: "Couldn't tell whether it worked",
  },
}

/**
 * Help text + CTA for the result footer when reason carries a known substring.
 * Returns null if the reason is empty or generic — the banner is enough on its own.
 */
function mapReasonToHelp(
  reason: string,
  status: DeployAppStatus
): { text: string; cta?: { label: string; href: string } } | null {
  const lower = reason.toLowerCase()
  if (status === "UNKNOWN" || status === "FAIL") {
    if (lower.includes("ssh dial failed")) {
      return {
        text: "Couldn't reach the server over SSH — the deploy didn't run. Verify the host is online and the SSH key on file matches.",
      }
    }
    if (lower.includes("no ssh credentials")) {
      return {
        text: "This server doesn't have SSH credentials configured yet. We need to upload a key before deploys can run.",
        cta: { label: "Open an action request", href: "/action-requests" },
      }
    }
    if (lower.includes("context deadline exceeded")) {
      return {
        text: "The deploy took longer than 45 seconds. Check the output below — if it's incomplete, request a manual deploy.",
        cta: { label: "Open an action request", href: "/action-requests" },
      }
    }
    if (lower.includes("ssh auth")) {
      return {
        text: "SSH authentication was rejected. The key on file may be wrong or rotated.",
        cta: { label: "Open an action request", href: "/action-requests" },
      }
    }
  }
  if (status === "UNKNOWN" && reason.trim() === "") {
    return {
      text: "No RESULT marker was reported. The deploy script likely crashed before finishing — check the output above or request a manual deploy.",
      cta: { label: "Open an action request", href: "/action-requests" },
    }
  }
  return null
}

function mapErrorToHelp(message: string): {
  text: string
  cta?: { label: string; href: string }
} {
  if (message.startsWith(SCRIPT_NOT_FOUND_PREFIX)) {
    return {
      text: "The deploy script isn't installed on this VPS — this is a server-side provisioning step, not something you can fix from here.",
      cta: { label: "Open an action request", href: "/action-requests" },
    }
  }
  if (message === "deploy-app is only supported on VPS instances") {
    return {
      text: "Deploys only run on servers. This resource is a different type.",
    }
  }
  if (message === "access denied") {
    return { text: "You don't have permission to deploy this instance." }
  }
  if (message === "instance not found") {
    return { text: "This instance no longer exists." }
  }
  if (message === "invalid id") {
    return { text: "Invalid instance identifier." }
  }
  return { text: message }
}

export function InstanceDeployPage() {
  const { id } = useParams<{ id: string }>()
  const reduceMotion = useReducedMotion()

  const instanceQ = useInstance(id)
  const deployApp = useDeployApp()
  // Pull a generous batch of recent activity filtered to deploys; the audit
  // listing endpoint already accepts action_type as a filter.
  const actionsQ = useInstanceActions(id, { limit: 50, action_type: "DEPLOY_APP" })

  const [confirmOpen, setConfirmOpen] = useState(false)
  const [result, setResult] = useState<DeployAppResponse | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  // Snapshot the moment the request went out so the elapsed timer can count
  // up while the synchronous call is in flight.
  const [startedAt, setStartedAt] = useState<number | null>(null)
  const outputRef = useRef<HTMLPreElement | null>(null)

  // Auto-scroll output to the bottom on result arrival (instant — reduced-motion
  // media query in index.css already kills smooth scroll globally).
  useEffect(() => {
    if (!result?.output || !outputRef.current) return
    outputRef.current.scrollTop = outputRef.current.scrollHeight
  }, [result?.action_id, result?.output])

  // All useMemos BEFORE any early return so hook order is stable.
  const deploys = useMemo(
    () => (actionsQ.data?.data ?? []) as Action[],
    [actionsQ.data]
  )
  const completedDeploys = useMemo(
    () => deploys.filter((a) => a.completed_at),
    [deploys]
  )
  const successCount = useMemo(
    () => completedDeploys.filter((a) => a.status === "SUCCESS").length,
    [completedDeploys]
  )
  const failCount = useMemo(
    () => completedDeploys.filter((a) => a.status === "FAILED").length,
    [completedDeploys]
  )
  const avgDuration = useMemo(() => {
    if (completedDeploys.length === 0) return null
    const total = completedDeploys.reduce((sum, a) => {
      const ms =
        new Date(a.completed_at!).getTime() - new Date(a.started_at).getTime()
      return sum + ms
    }, 0)
    return total / completedDeploys.length / 1000
  }, [completedDeploys])
  const lastDeploy = deploys[0] ?? null

  if (instanceQ.isLoading) return <LoadingPage label="Loading…" />
  if (instanceQ.isError || !instanceQ.data) {
    return (
      <ErrorState
        title="We couldn't load this server"
        error={instanceQ.error as Error}
        onRetry={() => instanceQ.refetch()}
      />
    )
  }
  const instance = instanceQ.data
  const isVps = instance.type === "VPS"

  const handleDeploy = async () => {
    if (!id) return
    setErrorMsg(null)
    setResult(null)
    setStartedAt(Date.now())
    try {
      const res = await deployApp.mutateAsync(id)
      setResult(res)
      // Refresh the recent-deploys list so the new audit row shows up.
      actionsQ.refetch()
    } catch (err) {
      const friendly = normalizeError(err).message
      setErrorMsg(friendly || "Deployment failed.")
    } finally {
      setConfirmOpen(false)
      setStartedAt(null)
    }
  }

  return (
    <motion.div
      className="space-y-6"
      initial="initial"
      animate="enter"
      variants={reduceMotion ? reducedVariants : pageVariants}
    >
      <nav className="flex items-center gap-1.5 text-sm text-fg-muted">
        <Link to="/instances" className="hover:text-fg">
          Infrastructure
        </Link>
        <ChevronRight className="h-3.5 w-3.5" aria-hidden />
        <Link to={`/instances/${instance.id}`} className="hover:text-fg">
          {instance.name}
        </Link>
        <ChevronRight className="h-3.5 w-3.5" aria-hidden />
        <span className="font-medium text-fg">Deploy</span>
      </nav>

      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-[1.5rem] font-bold leading-tight text-fg tracking-tight xs:text-[1.625rem] sm:text-[1.75rem]">
            Deploy application
          </h1>
          <p className="mt-1 text-[0.9375rem] text-fg-muted">
            Runs <code className="rounded bg-surface-sunken px-1 py-0.5 font-mono text-[0.8125rem]">/root/deploy.sh</code> on this server over SSH and shows the result below. Typical runs finish in under a minute.
          </p>
        </div>
        {lastDeploy ? (
          <div className="text-left text-sm text-fg-muted sm:text-right">
            <p>Last deployed {formatRelative(lastDeploy.started_at)}</p>
            {avgDuration != null ? (
              <p className="text-xs text-fg-subtle">
                {completedDeploys.length} deploy{completedDeploys.length === 1 ? "" : "s"} ·{" "}
                avg {formatDuration(avgDuration)}
              </p>
            ) : null}
          </div>
        ) : null}
      </header>

      {!isVps ? (
        <Card>
          <EmptyState
            icon={Server}
            title="Deploy is only available on servers"
            description={`This is a ${typeLabel[instance.type].toLowerCase()} resource — it doesn't run application code, so there's nothing to deploy.`}
            action={{
              label: "Back to overview",
              onClick: () => window.history.back(),
              variant: "outline",
            }}
          />
        </Card>
      ) : (
        <>
          {/* Inline error from the HTTP layer */}
          {errorMsg && !result ? (
            <InlineErrorAlert message={errorMsg} />
          ) : null}

          {/* Trigger card */}
          <Card>
            <div className="space-y-5">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary-soft text-primary">
                  <Rocket className="h-5 w-5" aria-hidden />
                </div>
                <div className="min-w-0">
                  <CardTitle>Run a deploy</CardTitle>
                  <p className="mt-1 text-sm text-fg-muted">
                    We'll SSH in as <span className="font-mono">root</span>, execute the script, capture stdout, and report the outcome here. The script path is fixed at{" "}
                    <code className="rounded bg-surface-sunken px-1 py-0.5 font-mono text-[0.8125rem]">/root/deploy.sh</code>.
                  </p>
                </div>
              </div>
              <Button
                variant="primary"
                size="lg"
                fullWidth
                leftIcon={deployApp.isPending ? undefined : Rocket}
                isLoading={deployApp.isPending}
                disabled={deployApp.isPending}
                onClick={() => setConfirmOpen(true)}
              >
                Deploy now
              </Button>
            </div>
          </Card>

          {/* Running state — visible while the synchronous call is in flight */}
          {deployApp.isPending ? (
            <Card>
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-info-soft">
                  <Loader2 className="h-5 w-5 animate-spin text-info-fg" aria-hidden />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-fg">
                    Running /root/deploy.sh on {instance.host ?? instance.name}
                  </p>
                  <p className="mt-1 text-sm text-fg-muted">
                    Connecting over SSH, executing the script, and waiting for the RESULT marker. This usually takes a few seconds but can run up to a minute for large builds.
                  </p>
                  {startedAt != null ? (
                    <ElapsedTimer since={startedAt} />
                  ) : null}
                </div>
              </div>
            </Card>
          ) : null}

          {/* Result panel — only after a 200 from the backend */}
          {result ? (
            <ResultPanel
              result={result}
              onDeployAgain={() => {
                setResult(null)
                setErrorMsg(null)
                setConfirmOpen(true)
              }}
              outputRef={outputRef}
              reduceMotion={!!reduceMotion}
            />
          ) : null}

          {/* Recent deploys */}
          <section className="space-y-3">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-fg-muted">
                Recent deploys
              </h2>
              <Link
                to={`/instances/${instance.id}`}
                className="text-xs font-medium text-primary hover:underline"
              >
                View full activity →
              </Link>
            </div>

            {actionsQ.isLoading ? (
              <Card>
                <p className="px-4 py-6 text-center text-sm text-fg-muted">
                  Loading history…
                </p>
              </Card>
            ) : deploys.length === 0 ? (
              <Card>
                <EmptyState
                  icon={Rocket}
                  title="No deploys yet for this server"
                  description="Once you run a deploy, the last ten will show up here."
                />
              </Card>
            ) : (
              <div className="space-y-2">
                {deploys.slice(0, 10).map((a) => (
                  <ActionTimelineItem key={a.id} action={a} showOutput />
                ))}
              </div>
            )}
          </section>

          {/* Aggregate stats — quiet, last so it doesn't compete with action UX */}
          {completedDeploys.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Deploy stats</CardTitle>
              </CardHeader>
              <div className="grid grid-cols-1 gap-3 text-center sm:grid-cols-3">
                <Stat label="Total" value={String(completedDeploys.length)} />
                <Stat
                  label="Succeeded"
                  value={String(successCount)}
                  tone="success"
                />
                <Stat label="Failed" value={String(failCount)} tone={failCount > 0 ? "danger" : undefined} />
              </div>
              {avgDuration != null ? (
                <p className="mt-3 text-xs text-fg-subtle text-center">
                  Average runtime {formatDuration(avgDuration)}
                </p>
              ) : null}
            </Card>
          ) : null}

          {/* Tips */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-fg-subtle" aria-hidden />
                <CardTitle>How this works</CardTitle>
              </div>
            </CardHeader>
            <ul className="space-y-2 text-sm text-fg-muted">
              <li className="flex gap-2">
                <Terminal className="mt-0.5 h-4 w-4 shrink-0 text-fg-subtle" aria-hidden />
                <span>
                  The deploy script is the single source of truth — it decides
                  what gets pulled, built, and restarted. Edit{" "}
                  <code className="rounded bg-surface-sunken px-1 py-0.5 font-mono text-[0.8125rem]">/root/deploy.sh</code>{" "}
                  on the server if you need different behavior.
                </span>
              </li>
              <li className="flex gap-2">
                <ClipboardList className="mt-0.5 h-4 w-4 shrink-0 text-fg-subtle" aria-hidden />
                <span>
                  Every deploy creates an audit row, so the recent-deploys list and the per-instance activity feed stay in sync automatically.
                </span>
              </li>
              <li className="flex gap-2">
                <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-fg-subtle" aria-hidden />
                <span>
                  If the script isn't installed on the server, we'll surface a provisioning CTA — that's a server-side issue, not something you can fix from here.
                </span>
              </li>
            </ul>
          </Card>
        </>
      )}

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleDeploy}
        title="Deploy application?"
        description="This runs /root/deploy.sh on the server, which typically restarts your app. The process is fast but your service will reload — a few seconds of downtime is normal."
        confirmLabel="Yes, deploy"
        tone="default"
        requireCheckbox
        checkboxLabel="I understand the service will reload"
        isLoading={deployApp.isPending}
      />
    </motion.div>
  )
}

function ResultPanel({
  result,
  onDeployAgain,
  outputRef,
  reduceMotion,
}: {
  result: DeployAppResponse
  onDeployAgain: () => void
  outputRef: React.RefObject<HTMLPreElement | null>
  reduceMotion: boolean
}) {
  const banner = bannerStyle[result.status]
  const help = mapReasonToHelp(result.reason, result.status)

  return (
    <motion.div
      initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: [0.25, 1, 0.5, 1] }}
    >
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Latest result</CardTitle>
            <p className="mt-1 text-sm text-fg-muted">
              Captured just now from <span className="font-mono">/root/deploy.sh</span>.
            </p>
          </div>
          <Button variant="outline" size="sm" leftIcon={Rocket} onClick={onDeployAgain}>
            Deploy again
          </Button>
        </CardHeader>

        <div
          role="status"
          aria-live="polite"
          className={cn(
            "flex items-start gap-3 rounded-md p-4 ring-1 ring-inset",
            banner.bg,
            banner.fg,
            banner.ring
          )}
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface/60">
            <banner.Icon className="h-5 w-5" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">{banner.headline}</p>
            {result.reason ? (
              <p className="mt-1 text-sm opacity-90">{result.reason}</p>
            ) : null}
            {help ? (
              <div className="mt-3 flex items-start gap-2 text-sm">
                <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 opacity-80" aria-hidden />
                <div>
                  <p>{help.text}</p>
                  {help.cta ? (
                    <Link
                      to={help.cta.href}
                      className="mt-1 inline-flex font-medium underline underline-offset-2 hover:opacity-80"
                    >
                      {help.cta.label} →
                    </Link>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <div className="mt-5 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-fg-muted">
              Output
            </p>
            <ActionIdFooter actionId={result.action_id} />
          </div>
          <pre
            ref={outputRef}
            className="max-h-96 overflow-auto rounded-md border border-border/40 bg-surface-sunken p-3 font-mono text-xs leading-relaxed text-fg"
          >
            {result.output || "(no output captured)"}
          </pre>
        </div>
      </Card>
    </motion.div>
  )
}

function ActionIdFooter({ actionId }: { actionId: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(actionId)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // Clipboard may be blocked (e.g. insecure context) — silently no-op.
    }
  }

  return (
    <div className="flex items-center gap-2 text-xs text-fg-subtle">
      <span className="font-mono">Action {actionId.slice(0, 8)}</span>
      <button
        type="button"
        onClick={handleCopy}
        className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 hover:bg-surface-sunken focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        aria-label="Copy action ID"
      >
        {copied ? (
          <>
            <Check className="h-3 w-3 text-success-fg" aria-hidden />
            <span className="text-success-fg">Copied</span>
          </>
        ) : (
          <>
            <Copy className="h-3 w-3" aria-hidden />
            <span>Copy ID</span>
          </>
        )}
      </button>
    </div>
  )
}

function ElapsedTimer({ since }: { since: number }) {
  // Track "now" in state so the render itself is pure; the interval updates
  // it once per second to drive the visible counter.
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])
  const elapsedSec = Math.max(0, Math.round((now - since) / 1000))
  return (
    <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-fg-muted">
      <Clock className="h-3.5 w-3.5" aria-hidden />
      <span>
        Elapsed {formatDuration(elapsedSec)}
        {elapsedSec >= 45 ? (
          <span className="ml-2 text-warning-fg">
            · Hitting the 60s timeout soon
          </span>
        ) : null}
      </span>
    </p>
  )
}

function InlineErrorAlert({ message }: { message: string }) {
  const help = mapErrorToHelp(message)
  return (
    <div
      role="alert"
      className="rounded-md border border-danger bg-danger-soft/60 p-4 text-sm"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface/60">
          <XCircle className="h-5 w-5 text-danger-fg" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-danger-fg">Deploy couldn't start</p>
          <p className="mt-1 text-fg-muted">{help.text}</p>
          {help.cta ? (
            <Link
              to={help.cta.href}
              className="mt-2 inline-flex font-medium text-primary hover:underline"
            >
              {help.cta.label} →
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  )
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone?: "success" | "danger"
}) {
  const toneClass =
    tone === "success"
      ? "text-success-fg"
      : tone === "danger"
        ? "text-danger-fg"
        : "text-fg"
  return (
    <div className="rounded-md bg-surface-sunken/60 p-3">
      <p className={cn("text-2xl font-semibold tabular-nums", toneClass)}>
        {value}
      </p>
      <p className="mt-0.5 text-xs uppercase tracking-wider text-fg-muted">
        {label}
      </p>
    </div>
  )
}

InstanceDeployPage.displayName = "InstanceDeployPage"