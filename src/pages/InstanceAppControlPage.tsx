import { useEffect, useMemo, useRef, useState } from "react"
import { Link, useParams } from "react-router-dom"
import {
  Activity,
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Clock,
  Copy,
  Lightbulb,
  Loader2,
  Play,
  Power,
  RotateCw,
  Server,
  ShieldAlert,
  Square,
  Terminal,
  XCircle,
  type LucideIcon,
} from "lucide-react"
import { motion, useReducedMotion } from "framer-motion"
import { Card, CardHeader, CardTitle } from "../components/ui/Card"
import { Button } from "../components/ui/Button"
import { SegmentedControl } from "../components/ui/SegmentedControl"
import { LoadingPage } from "../components/ui/LoadingState"
import { ErrorState } from "../components/ui/ErrorState"
import { EmptyState } from "../components/ui/EmptyState"
import { ConfirmDialog } from "../components/ui/ConfirmDialog"
import { ActionTimelineItem } from "../components/data/ActionTimelineItem"
import { useAppControl, useInstance } from "../queries/instances"
import { useInstanceActions } from "../queries/actions"
import { normalizeError } from "../api/errors"
import { cn, formatRelative, formatDuration } from "../lib/utils"
import { pageVariants, reducedVariants } from "../lib/motion"
import type {
  Action,
  AppControlAction,
  AppControlResponse,
  AppControlStatus,
  InstanceType,
} from "../api/types"

const typeLabel: Record<InstanceType, string> = {
  VPS: "Server",
  RDS: "Database",
  REDIS: "Cache",
  STORAGE: "Storage",
}

/**
 * Per-verb guidance shown under the segmented selector. Operators want the
 * "what will this actually do" sentence right next to the verb — a separate
 * page or tooltip is one click too many in an incident.
 */
const verbHelp: Record<AppControlAction, string> = {
  status: "Reads goweb's current state without changing anything. Safe to run anytime.",
  start: "Begins running goweb. Use this if the service has been stopped.",
  stop: "Halts the service. Anything depending on goweb will lose access until you start it again.",
  restart: "Stops then starts goweb. Brief downtime while the service reloads, then a fresh process.",
}

/** User-facing headline for each response status. */
const bannerStyle: Record<
  AppControlStatus,
  { bg: string; fg: string; ring: string; Icon: LucideIcon; headline: string }
> = {
  ACTIVE: {
    bg: "bg-success-soft",
    fg: "text-success-fg",
    ring: "ring-success/25",
    Icon: CheckCircle2,
    headline: "goweb is running",
  },
  INACTIVE: {
    bg: "bg-warning-soft",
    fg: "text-warning-fg",
    ring: "ring-warning/30",
    Icon: AlertTriangle,
    headline: "goweb is stopped",
  },
  SUCCESS: {
    bg: "bg-success-soft",
    fg: "text-success-fg",
    ring: "ring-success/25",
    Icon: CheckCircle2,
    headline: "Action completed",
  },
  UNKNOWN: {
    bg: "bg-danger-soft",
    fg: "text-danger-fg",
    ring: "ring-danger/25",
    Icon: XCircle,
    headline: "Couldn't tell whether it worked",
  },
}

/**
 * Tailored explanation for an UNKNOWN / INACTIVE outcome. The raw message
 * from the backend is shown by default; this only adds a sentence + CTA
 * when we recognize a known failure shape in `message` or `output`.
 */
function mapMessageToHelp(
  message: string,
  output: string,
  status: AppControlStatus
): { text: string; cta?: { label: string; href: string } } | null {
  const haystack = `${message}\n${output}`.toLowerCase()
  if (status === "UNKNOWN" || status === "INACTIVE") {
    if (haystack.includes("ssh dial failed")) {
      return {
        text: "Couldn't reach the server over SSH — the action didn't run. Verify the host is online and the SSH key on file matches.",
      }
    }
    if (haystack.includes("no ssh credentials")) {
      return {
        text: "This server doesn't have SSH credentials configured yet — we need a key on file before actions can run.",
        cta: { label: "Open an action request", href: "/action-requests" },
      }
    }
    if (haystack.includes("ssh auth")) {
      return {
        text: "SSH authentication was rejected. The key on file may be wrong or rotated.",
        cta: { label: "Open an action request", href: "/action-requests" },
      }
    }
    if (haystack.includes("a password is required")) {
      return {
        text: "The server asked for a sudo password. The SSH user needs passwordless sudo for systemctl before this works.",
        cta: { label: "Open an action request", href: "/action-requests" },
      }
    }
  }
  if (status === "INACTIVE") {
    return {
      text: "Service is not running. Start it from the controls above, or check the output below for a crash hint.",
    }
  }
  return null
}

function mapErrorToHelp(message: string): {
  text: string
  cta?: { label: string; href: string }
} {
  if (message === "app-control is only supported on VPS instances") {
    return {
      text: "App control only runs on servers. This resource is a different type.",
    }
  }
  if (message === "access denied") {
    return { text: "You don't have permission to control this instance." }
  }
  if (message === "instance not found") {
    return { text: "This instance no longer exists." }
  }
  if (message === "invalid id") {
    return { text: "Invalid instance identifier." }
  }
  if (message.startsWith("action failed the oneof check")) {
    return {
      text: "The action you sent wasn't recognized. Only start, stop, restart, and status are allowed.",
    }
  }
  return { text: message }
}

export function InstanceAppControlPage() {
  const { id } = useParams<{ id: string }>()
  const reduceMotion = useReducedMotion()

  const instanceQ = useInstance(id)
  const appControl = useAppControl()
  const actionsQ = useInstanceActions(id, { limit: 50, action_type: "APP_CONTROL" })

  const [verb, setVerb] = useState<AppControlAction>("status")
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [result, setResult] = useState<AppControlResponse | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [startedAt, setStartedAt] = useState<number | null>(null)
  const outputRef = useRef<HTMLPreElement | null>(null)

  // Auto-scroll output to the bottom on result arrival.
  useEffect(() => {
    if (!result?.output || !outputRef.current) return
    outputRef.current.scrollTop = outputRef.current.scrollHeight
  }, [result?.action_id, result?.output])

  const actions = useMemo(
    () => (actionsQ.data?.data ?? []) as Action[],
    [actionsQ.data]
  )
  const lastAction = actions[0] ?? null

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

  const run = async () => {
    if (!id) return
    setErrorMsg(null)
    setResult(null)
    setStartedAt(Date.now())
    try {
      const res = await appControl.mutateAsync({ id, body: { action: verb } })
      setResult(res)
      actionsQ.refetch()
    } catch (err) {
      const friendly = normalizeError(err).message
      setErrorMsg(friendly || "App control failed.")
    } finally {
      setConfirmOpen(false)
      setStartedAt(null)
    }
  }

  // Confirmation policy: status is a read; start is reversible and quick;
  // stop and restart drop the service, so they require an explicit ack.
  const needsConfirm = verb !== "status"
  const isDanger = verb === "stop" || verb === "restart"
  const verbIcon: Record<AppControlAction, LucideIcon> = {
    status: Activity,
    start: Play,
    stop: Square,
    restart: RotateCw,
  }
  const ctaLabel =
    verb === "status"
      ? "Check status"
      : `${verb[0].toUpperCase()}${verb.slice(1)} now`

  const confirmCopy = {
    status: null,
    start: {
      title: "Start goweb?",
      description:
        "This will start the goweb service on the server. The action takes a moment and is easy to revert.",
      confirmLabel: "Yes, start",
      checkbox: false,
    },
    stop: {
      title: "Stop goweb?",
      description:
        "This halts the goweb service. Anything depending on it (web traffic, jobs, health checks) will lose access until you start it again.",
      confirmLabel: "Yes, stop",
      checkbox: true,
      checkboxLabel: "I understand the service will stop",
    },
    restart: {
      title: "Restart goweb?",
      description:
        "This stops then starts the goweb service. There will be a few seconds of downtime while the service reloads.",
      confirmLabel: "Yes, restart",
      checkbox: true,
      checkboxLabel: "I understand the service will reload",
    },
  }[verb]

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
        <span className="font-medium text-fg">App control</span>
      </nav>

      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-[1.5rem] font-bold leading-tight text-fg tracking-tight xs:text-[1.625rem] sm:text-[1.75rem]">
            App control
          </h1>
          <p className="mt-1 text-[0.9375rem] text-fg-muted">
            Start, stop, restart, or check the status of the{" "}
            <code className="rounded bg-surface-sunken px-1 py-0.5 font-mono text-[0.8125rem]">
              goweb
            </code>{" "}
            service running on this server. The service name is fixed.
          </p>
        </div>
        {lastAction ? (
          <div className="text-left text-sm text-fg-muted sm:text-right">
            <p>Last action {formatRelative(lastAction.started_at)}</p>
            {lastAction.status ? (
              <p className="text-xs text-fg-subtle">{lastAction.status.toLowerCase()}</p>
            ) : null}
          </div>
        ) : null}
      </header>

      {!isVps ? (
        <Card>
          <EmptyState
            icon={Server}
            title="App control is only available on servers"
            description={`This is a ${typeLabel[instance.type].toLowerCase()} resource — there's no goweb service running on it.`}
            action={{
              label: "Back to overview",
              onClick: () => window.history.back(),
              variant: "outline",
            }}
          />
        </Card>
      ) : (
        <>
          {errorMsg && !result ? <InlineErrorAlert message={errorMsg} /> : null}

          {/* Trigger card */}
          <Card>
            <div className="space-y-5">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary-soft text-primary">
                  <Power className="h-5 w-5" aria-hidden />
                </div>
                <div className="min-w-0">
                  <CardTitle>Run an action</CardTitle>
                  <p className="mt-1 text-sm text-fg-muted">
                    SSHes in as{" "}
                    <span className="font-mono">root</span> and runs{" "}
                    <code className="rounded bg-surface-sunken px-1 py-0.5 font-mono text-[0.8125rem]">
                      systemctl {"<action>"} goweb
                    </code>
                    . The full output is captured below.
                  </p>
                </div>
              </div>

              <div>
                <SegmentedControl
                  ariaLabel="App control action"
                  value={verb}
                  onChange={setVerb}
                  options={[
                    { value: "status", label: "Status", icon: Activity },
                    { value: "start", label: "Start", icon: Play },
                    { value: "stop", label: "Stop", icon: Square },
                    { value: "restart", label: "Restart", icon: RotateCw },
                  ]}
                />
                <p
                  key={verb}
                  className="mt-3 text-sm text-fg-muted"
                  aria-live="polite"
                >
                  {verbHelp[verb]}
                </p>
              </div>

              <Button
                variant={isDanger ? "outline-danger" : "primary"}
                size="lg"
                fullWidth
                leftIcon={
                  appControl.isPending ? undefined : verbIcon[verb]
                }
                isLoading={appControl.isPending}
                disabled={appControl.isPending}
                onClick={() => (needsConfirm ? setConfirmOpen(true) : run())}
              >
                {ctaLabel}
              </Button>
            </div>
          </Card>

          {/* Running state */}
          {appControl.isPending ? (
            <Card>
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-info-soft">
                  <Loader2
                    className="h-5 w-5 animate-spin text-info-fg"
                    aria-hidden
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-fg">
                    Running{" "}
                    <code className="font-mono">
                      systemctl {verb} goweb
                    </code>{" "}
                    on {instance.host ?? instance.name}
                  </p>
                  <p className="mt-1 text-sm text-fg-muted">
                    Connecting over SSH and waiting for systemctl to return.
                    This usually finishes in seconds, but can run up to a minute
                    on a slow host.
                  </p>
                  {startedAt != null ? (
                    <ElapsedTimer since={startedAt} />
                  ) : null}
                </div>
              </div>
            </Card>
          ) : null}

          {/* Result panel */}
          {result ? (
            <ResultPanel
              result={result}
              verb={verb}
              onAgain={() => {
                setResult(null)
                setErrorMsg(null)
                if (needsConfirm) setConfirmOpen(true)
                else run()
              }}
              outputRef={outputRef}
              reduceMotion={!!reduceMotion}
            />
          ) : null}

          {/* Recent actions */}
          <section className="space-y-3">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-fg-muted">
                Recent app-control actions
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
            ) : actions.length === 0 ? (
              <Card>
                <EmptyState
                  icon={Power}
                  title="No app-control actions yet"
                  description="The last ten actions on goweb will appear here."
                />
              </Card>
            ) : (
              <div className="space-y-2">
                {actions.slice(0, 10).map((a) => (
                  <ActionTimelineItem key={a.id} action={a} showOutput />
                ))}
              </div>
            )}
          </section>

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
                  The service name{" "}
                  <code className="rounded bg-surface-sunken px-1 py-0.5 font-mono text-[0.8125rem]">
                    goweb
                  </code>{" "}
                  is hardcoded server-side. To control other services on this
                  VPS, open an action request.
                </span>
              </li>
              <li className="flex gap-2">
                <ClipboardList className="mt-0.5 h-4 w-4 shrink-0 text-fg-subtle" aria-hidden />
                <span>
                  Every action creates an audit row, so the recent-activity
                  list above and the per-instance{" "}
                  <span className="font-medium text-fg">Activity</span> tab
                  stay in sync automatically.
                </span>
              </li>
              <li className="flex gap-2">
                <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-fg-subtle" aria-hidden />
                <span>
                  If SSH fails or credentials are missing, the response
                  surfaces a precise reason — no guessing. Use the action
                  request page if you can't reach SSH yourself.
                </span>
              </li>
            </ul>
          </Card>
        </>
      )}

      {confirmCopy ? (
        <ConfirmDialog
          open={confirmOpen}
          onClose={() => setConfirmOpen(false)}
          onConfirm={run}
          title={confirmCopy.title}
          description={confirmCopy.description}
          confirmLabel={confirmCopy.confirmLabel}
          tone={isDanger ? "danger" : "default"}
          requireCheckbox={confirmCopy.checkbox}
          checkboxLabel={
            "checkboxLabel" in confirmCopy
              ? confirmCopy.checkboxLabel
              : undefined
          }
          isLoading={appControl.isPending}
        />
      ) : null}
    </motion.div>
  )
}

function ResultPanel({
  result,
  verb,
  onAgain,
  outputRef,
  reduceMotion,
}: {
  result: AppControlResponse
  verb: AppControlAction
  onAgain: () => void
  outputRef: React.RefObject<HTMLPreElement | null>
  reduceMotion: boolean
}) {
  const banner = bannerStyle[result.status]
  const help = mapMessageToHelp(result.message, result.output, result.status)
  const statusLabel =
    verb === "status"
      ? "Latest status"
      : `Latest ${verb} result`

  return (
    <motion.div
      initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: [0.25, 1, 0.5, 1] }}
    >
      <Card>
        <CardHeader>
          <div>
            <CardTitle>{statusLabel}</CardTitle>
            <p className="mt-1 text-sm text-fg-muted">
              Captured just now from{" "}
              <code className="font-mono">
                systemctl {verb} goweb
              </code>
              .
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            leftIcon={verb === "status" ? Activity : Power}
            onClick={onAgain}
            isLoading={false}
          >
            Run again
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
            {result.message ? (
              <p className="mt-1 text-sm opacity-90">{result.message}</p>
            ) : null}
            {help ? (
              <div className="mt-3 flex items-start gap-2 text-sm">
                <Lightbulb
                  className="mt-0.5 h-4 w-4 shrink-0 opacity-80"
                  aria-hidden
                />
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
            className="max-h-96 overflow-auto rounded-md border border-border/40 bg-surface-sunken p-3 font-mono text-xs leading-relaxed text-fg whitespace-pre-wrap break-words"
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
            · Hitting the 90s timeout soon
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
          <p className="font-semibold text-danger-fg">
            App control couldn't start
          </p>
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

InstanceAppControlPage.displayName = "InstanceAppControlPage"
