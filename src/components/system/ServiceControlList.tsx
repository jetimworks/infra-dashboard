import { useState } from "react"
import { Link } from "react-router-dom"
import {
  CheckCircle2,
  Play,
  Power,
  RefreshCw,
  RotateCw,
  Settings2,
  Square,
  XCircle,
} from "lucide-react"
import { Card, CardHeader, CardTitle } from "../ui/Card"
import { Button } from "../ui/Button"
import { ConfirmDialog } from "../ui/ConfirmDialog"
import { EmptyState } from "../ui/EmptyState"
import { ErrorState } from "../ui/ErrorState"
import { LoadingBlock } from "../ui/LoadingState"
import { WarningBlock } from "./WarningBlock"
import { useControlService } from "../../queries/system"
import { normalizeError } from "../../api/errors"
import { baseUnitName } from "../../lib/ops-host"
import {
  HOST_WIDE_SERVICE_UNITS,
  SERVICE_CONTROL_ACTIONS,
  WRITABLE_SERVICE_UNITS,
  type ServiceControlAction,
} from "../../lib/ops-constants"
import { cn } from "../../lib/utils"
import type { ServiceControlResponse, ServiceUnit } from "../../api/types"

/**
 * The systemd inventory, and the verbs on the units the platform may act on.
 *
 * Three rules shape this panel:
 *
 *   - Only the seven curated units get verbs. Everything else on the host is
 *     listed and left alone — the backend refuses those units anyway, and
 *     offering a button that always fails is worse than offering none.
 *   - The blast-radius warning appears BEFORE the confirm dialog, not after.
 *     The operator has to be able to see that stopping nginx takes the child
 *     instances down while they are still deciding.
 *   - The endpoint answers HTTP 200 even when the command failed, and then
 *     the body carries `status: "UNKNOWN"`. The verdict is read from the
 *     body; the HTTP code says nothing.
 */

export interface ServiceControlListProps {
  instanceId: string
  units: ServiceUnit[]
  loading: boolean
  error: { message: string } | null
  onRetry: () => void
  /** The instance's own application unit — managed on the app-control page. */
  appUnit: string | null
  /** How many instances this host parents. Drives the blast-radius warning. */
  childCount: number
  /** Only a VPS may act on units. */
  canControl: boolean
}

interface PendingAction {
  unit: string
  action: ServiceControlAction
}

export function ServiceControlList({
  instanceId,
  units,
  loading,
  error,
  onRetry,
  appUnit,
  childCount,
  canControl,
}: ServiceControlListProps) {
  const control = useControlService()
  const [pending, setPending] = useState<PendingAction | null>(null)
  const [result, setResult] = useState<ServiceControlResponse | null>(null)
  const [failure, setFailure] = useState<{ unit: string; message: string } | null>(
    null
  )

  const run = async () => {
    if (!pending) return
    const target = pending
    setFailure(null)
    setResult(null)
    try {
      const response = await control.mutateAsync({
        instanceId,
        unit: target.unit,
        action: target.action,
      })
      setResult(response)
    } catch (err) {
      setFailure({ unit: target.unit, message: normalizeError(err).message })
    } finally {
      setPending(null)
    }
  }

  const busy =
    control.isPending && pending !== null
      ? `${pending.unit}:${pending.action}`
      : null

  return (
    <>
      <Card padding="none">
        <CardHeader className="px-4 pt-4">
          <div className="flex items-center gap-2">
            <Settings2 className="h-4 w-4 text-fg-muted" aria-hidden />
            <CardTitle>Services</CardTitle>
          </div>
          <span className="text-xs text-fg-muted">
            {units.length} {units.length === 1 ? "unit" : "units"}
          </span>
        </CardHeader>

        {error ? (
          <div className="px-4 pb-4">
            <ErrorState
              title="Couldn't read the service inventory"
              description={error.message}
              onRetry={onRetry}
              className="py-8"
            />
          </div>
        ) : loading && units.length === 0 ? (
          <LoadingBlock label="Reading systemd units…" className="py-8" />
        ) : units.length === 0 ? (
          <EmptyState
            icon={Settings2}
            title="No units reported"
            description="systemd returned nothing for this host."
            className="py-8"
          />
        ) : (
          <ul className="divide-y divide-border/30 border-t border-border/40">
            {units.map((unit) => {
              const base = baseUnitName(unit.unit)
              const isCurated = (WRITABLE_SERVICE_UNITS as readonly string[]).includes(
                base
              )
              const isHostWide = (HOST_WIDE_SERVICE_UNITS as readonly string[]).includes(
                base
              )
              const isAppUnit = appUnit !== null && base === appUnit
              const showResult =
                result !== null && baseUnitName(result.unit) === base

              return (
                <li key={unit.unit} className="px-4 py-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <UnitDot
                          activeState={unit.active_state}
                          subState={unit.sub_state}
                        />
                        <span className="font-mono text-sm font-medium text-fg">
                          {base}
                        </span>
                        {unit.unit !== base ? (
                          <span className="font-mono text-xs text-fg-subtle">
                            {unit.unit}
                          </span>
                        ) : null}
                        {isHostWide ? (
                          <span className="rounded-full bg-info-soft px-2 py-0.5 text-[0.6875rem] font-medium text-info-fg">
                            Host-wide
                          </span>
                        ) : null}
                        {isAppUnit ? (
                          <span className="rounded-full bg-primary-soft px-2 py-0.5 text-[0.6875rem] font-medium text-primary-soft-fg">
                            This app
                          </span>
                        ) : null}
                      </div>

                      {unit.description ? (
                        <p className="mt-1 text-sm text-fg-muted">
                          {unit.description}
                        </p>
                      ) : null}

                      <p className="mt-1 font-mono text-[0.6875rem] text-fg-subtle">
                        {unit.load_state} · {unit.active_state} (
                        {unit.sub_state})
                      </p>
                    </div>

                    <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                      {isCurated && canControl ? (
                        SERVICE_CONTROL_ACTIONS.map((action) => (
                          <Button
                            key={action}
                            variant={
                              action === "stop" ? "outline-danger" : "outline"
                            }
                            size="sm"
                            leftIcon={VERB_ICONS[action]}
                            isLoading={busy === `${base}:${action}`}
                            disabled={busy !== null}
                            onClick={() =>
                              setPending({ unit: base, action })
                            }
                          >
                            {action[0].toUpperCase() + action.slice(1)}
                          </Button>
                        ))
                      ) : null}

                      {isAppUnit && !isCurated ? (
                        <Link
                          to={`/instances/${instanceId}/app-control`}
                          className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-border/60 bg-surface/80 px-3.5 text-sm font-medium text-fg transition-[background-color,border-color] duration-200 hover:border-border hover:bg-surface-sunken"
                        >
                          <Power className="h-4 w-4" aria-hidden />
                          App control
                        </Link>
                      ) : null}
                    </div>
                  </div>

                  {isHostWide && childCount > 0 && canControl ? (
                    <WarningBlock
                      className="mt-3"
                      title="This affects every instance on the host"
                      warnings={[
                        `${base} is a host-wide service and this server hosts ${childCount} child instance${
                          childCount === 1 ? "" : "s"
                        }; stopping it affects all of them.`,
                      ]}
                    />
                  ) : null}

                  {showResult ? (
                    <ServiceResult result={result!} />
                  ) : null}

                  {failure && failure.unit === base ? (
                    <div
                      role="alert"
                      className="mt-3 flex items-start gap-3 rounded-md bg-danger-soft p-4 ring-1 ring-inset ring-danger/25"
                    >
                      <XCircle
                        className="mt-0.5 h-5 w-5 shrink-0 text-danger-fg"
                        aria-hidden
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-danger-fg">
                          The command didn't run
                        </p>
                        <p className="mt-1 break-words text-sm text-fg">
                          {failure.message}
                        </p>
                      </div>
                    </div>
                  ) : null}
                </li>
              )
            })}
          </ul>
        )}
      </Card>

      <ConfirmDialog
        open={pending !== null}
        onClose={() => setPending(null)}
        onConfirm={run}
        title={pending ? confirmTitle(pending) : ""}
        description={pending ? confirmDescription(pending) : ""}
        confirmLabel={pending ? confirmLabel(pending.action) : "Confirm"}
        tone={pending && DANGEROUS_ACTIONS.has(pending.action) ? "danger" : "default"}
        requireCheckbox={pending ? DANGEROUS_ACTIONS.has(pending.action) : false}
        checkboxLabel={
          pending && pending.action === "stop"
            ? "I understand the service will stop"
            : "I understand the service will reload"
        }
        isLoading={control.isPending}
      />
    </>
  )
}

const VERB_ICONS: Record<ServiceControlAction, typeof Play> = {
  start: Play,
  stop: Square,
  restart: RotateCw,
  reload: RefreshCw,
}

const DANGEROUS_ACTIONS = new Set<ServiceControlAction>(["stop", "restart"])

function confirmTitle({ unit, action }: PendingAction): string {
  return `${action[0].toUpperCase()}${action.slice(1)} ${unit}?`
}

function confirmDescription({ unit, action }: PendingAction): string {
  switch (action) {
    case "start":
      return `This starts the ${unit} service on the host. It takes a moment to come up, and anything waiting on it can connect once it does.`
    case "stop":
      return `This halts the ${unit} service. Anything depending on it — web traffic, health checks, background jobs — loses access until you start it again.`
    case "restart":
      return `This stops then starts the ${unit} service. There will be a few seconds of downtime while it reloads.`
    case "reload":
      return `This asks the ${unit} service to reload its configuration without replacing the process. Not every unit supports a reload.`
  }
}

function confirmLabel(action: ServiceControlAction): string {
  switch (action) {
    case "start":
      return "Yes, start it"
    case "stop":
      return "Yes, stop it"
    case "restart":
      return "Yes, restart it"
    case "reload":
      return "Yes, reload it"
  }
}

/** The dot beside a unit name — the one thing an operator looks for first. */
function UnitDot({
  activeState,
  subState,
}: {
  activeState: string
  subState: string
}) {
  const tone = unitTone(activeState, subState)
  return (
    <span
      className={cn(
        "inline-block h-2 w-2 shrink-0 rounded-full",
        tone === "success"
          ? "bg-success"
          : tone === "danger"
            ? "bg-danger"
            : tone === "warning"
              ? "bg-warning"
              : tone === "info"
                ? "bg-info"
                : "bg-fg-subtle"
      )}
      aria-hidden
    />
  )
}

function unitTone(activeState: string, subState: string) {
  if (activeState === "active") return "success"
  if (subState === "failed" || activeState === "failed") return "danger"
  if (activeState === "activating" || activeState === "deactivating") {
    return "info"
  }
  if (activeState === "inactive") return "warning"
  return "neutral"
}

/**
 * The outcome of one command.
 *
 * `status: "UNKNOWN"` is the backend's way of saying the command reached the
 * host and did not succeed — the HTTP status was 200 all the same. The raw
 * systemctl output is shown verbatim, because that output is the only thing
 * that says what actually happened.
 */
function ServiceResult({ result }: { result: ServiceControlResponse }) {
  const unknown = result.status === "UNKNOWN"

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "mt-3 flex items-start gap-3 rounded-md p-4 ring-1 ring-inset",
        unknown
          ? "bg-danger-soft text-danger-fg ring-danger/25"
          : "bg-success-soft text-success-fg ring-success/25"
      )}
    >
      {unknown ? (
        <XCircle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
      ) : (
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
      )}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">
          {unknown
            ? "Couldn't tell whether it worked"
            : `${result.unit} ${result.action} completed`}
        </p>
        {result.output ? (
          <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap break-words rounded-md border border-border/40 bg-surface-sunken p-3 font-mono text-[0.6875rem] leading-relaxed text-fg">
            {result.output}
          </pre>
        ) : null}
        <WarningBlock warnings={result.warnings ?? []} className="mt-3" />
        {result.action_id ? (
          <p className="mt-2 font-mono text-[0.6875rem] opacity-70">
            Action {result.action_id.slice(0, 8)}
          </p>
        ) : null}
      </div>
    </div>
  )
}
