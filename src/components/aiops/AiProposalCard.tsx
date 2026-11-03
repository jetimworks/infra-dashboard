import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import {
  CheckCircle2,
  Clock,
  Hourglass,
  Rocket,
  ShieldQuestion,
  XCircle,
} from "lucide-react"
import { Card } from "../ui/Card"
import { Button } from "../ui/Button"
import { WarningBlock } from "../system/WarningBlock"
import { useAiProposal } from "../../queries/aiops"
import { normalizeError } from "../../api/errors"
import type { AiExecuteResult } from "../../api/aiops"
import type { AiProposal } from "../../api/types"
import {
  formatCountdown,
  millisecondsUntil,
  proposalEffect,
  proposalLabel,
  proposalParams,
} from "../../lib/ai-proposals"
import { cn } from "../../lib/utils"

/**
 * What happened when the operator confirmed a proposal.
 *
 * The three outcomes are genuinely different states, not three flavours of
 * failure:
 *
 *   - `done` — the operation ran. The card shows what the server said.
 *   - `spent` — the server consumed the proposal and then refused it. The
 *     proposal is gone either way, so the card says so and stops offering to
 *     run it again.
 *   - `retryable` — the request never reached the server, so the proposal
 *     may still be waiting. The card keeps its button.
 */
export type AiProposalOutcome =
  | { kind: "done"; result: AiExecuteResult }
  | { kind: "spent"; message: string }
  | { kind: "retryable"; message: string }

export interface AiProposalCardProps {
  proposal: AiProposal
  /** The instance the proposal is about — used to link at the release it starts. */
  instanceId: string
  /** What happened when the operator confirmed, or null if nothing was tried. */
  outcome: AiProposalOutcome | null
  /** Whether a confirmation is in flight. */
  busy: boolean
  onConfirm: (proposal: AiProposal) => void
}

export function AiProposalCard({
  proposal,
  instanceId,
  outcome,
  busy,
  onConfirm,
}: AiProposalCardProps) {
  const [now, setNow] = useState(() => Date.now())

  // The proposal's own record, re-read from the store. It is the only way to
  // learn that a proposal has gone — expired, or consumed in another tab —
  // before the operator presses the button.
  const proposalQ = useAiProposal(proposal.id)
  const gone =
    proposalQ.isError && normalizeError(proposalQ.error).status === 404

  // The store's own expiry is authoritative; the copy that came with the
  // answer is only a fallback for the moment before the re-read lands.
  const expiresAt = proposalQ.data?.expires_at ?? proposal.expires_at
  const remaining = millisecondsUntil(expiresAt, now)
  const expired = remaining === null

  // The clock only runs while the card is still live. Once the proposal has
  // been confirmed or has expired there is nothing left to count down, and a
  // timer that keeps firing re-renders the page for no reason.
  const live = outcome === null && !expired
  useEffect(() => {
    if (!live) return
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [live])

  const params = proposalParams(proposal)
  const confirmed = outcome?.kind === "done"

  const blocked = expired || gone
  const canConfirm = !blocked && outcome?.kind !== "spent" && !confirmed

  return (
    <Card accent="accent" padding="none" className="overflow-hidden">
      <div className="px-4 py-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-fg">
            {proposalLabel(proposal.type)}
          </span>
          {outcome === null ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-accent-soft px-2 py-0.5 text-[0.6875rem] font-medium text-accent-soft-fg">
              <ShieldQuestion className="h-3 w-3" aria-hidden />
              Waiting for confirmation
            </span>
          ) : null}
          {confirmed ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-success-soft px-2 py-0.5 text-[0.6875rem] font-medium text-success-fg">
              <CheckCircle2 className="h-3 w-3" aria-hidden />
              Confirmed
            </span>
          ) : null}
        </div>

        {proposal.summary ? (
          <p className="mt-1.5 text-sm text-fg-muted">{proposal.summary}</p>
        ) : null}

        <p className="mt-2 text-[0.9375rem] font-medium text-fg">
          {proposalEffect(proposal)}
        </p>

        {params.length > 0 ? (
          <dl className="mt-3 grid gap-x-6 gap-y-1.5 sm:grid-cols-[auto_1fr]">
            {params.map((param) => (
              <div key={param.label} className="contents">
                <dt className="text-xs text-fg-subtle">{param.label}</dt>
                <dd
                  className={cn(
                    "min-w-0 break-words text-sm text-fg",
                    param.mono && "font-mono text-[0.8125rem]"
                  )}
                >
                  {param.value}
                </dd>
              </div>
            ))}
          </dl>
        ) : null}

        {outcome === null ? (
          <p className="mt-3 text-xs text-fg-subtle">
            Nothing has happened yet. Confirming runs this on the server.
          </p>
        ) : null}

        {outcome?.kind === "done" ? (
          <ExecutionResult result={outcome.result} instanceId={instanceId} />
        ) : null}

        {outcome?.kind === "spent" ? (
          <AttemptFailed
            message={outcome.message}
            title="The proposal was used and could not be run"
            note="The console consumes a proposal before it runs it, so it cannot be run a second time. Ask the assistant for a new one."
          />
        ) : null}

        {outcome?.kind === "retryable" ? (
          <AttemptFailed
            message={outcome.message}
            title="The request did not reach the server"
            note="Nothing was run and the proposal is still waiting. You can try again."
            tone="warning"
          />
        ) : null}

        {outcome === null || outcome.kind === "retryable" ? (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-border/40 pt-3">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 text-xs",
                blocked ? "text-fg-subtle" : "text-fg-muted"
              )}
            >
              {blocked ? (
                <Hourglass className="h-3.5 w-3.5" aria-hidden />
              ) : (
                <Clock className="h-3.5 w-3.5" aria-hidden />
              )}
              {gone
                ? "This proposal is no longer available"
                : expired
                  ? "Expired"
                  : `Expires in ${formatCountdown(remaining!)}`}
            </span>

            <Button
              variant="primary"
              size="sm"
              leftIcon={Rocket}
              isLoading={busy}
              disabled={!canConfirm}
              onClick={() => onConfirm(proposal)}
            >
              Confirm
            </Button>
          </div>
        ) : null}
      </div>
    </Card>
  )
}

AiProposalCard.displayName = "AiProposalCard"

/**
 * A confirmation that did not work.
 *
 * The server's own words are shown verbatim — the refusal is the diagnosis,
 * and paraphrasing it would throw away the part that says why.
 */
function AttemptFailed({
  title,
  message,
  note,
  tone = "danger",
}: {
  title: string
  message: string
  note: string
  tone?: "danger" | "warning"
}) {
  return (
    <div
      role="alert"
      className={cn(
        "mt-3 flex items-start gap-3 rounded-md p-3.5 ring-1 ring-inset",
        tone === "danger"
          ? "bg-danger-soft ring-danger/25"
          : "bg-warning-soft ring-warning/25"
      )}
    >
      <XCircle
        className={cn(
          "mt-0.5 h-4 w-4 shrink-0",
          tone === "danger" ? "text-danger-fg" : "text-warning-fg"
        )}
        aria-hidden
      />
      <div className="min-w-0">
        <p
          className={cn(
            "text-sm font-semibold",
            tone === "danger" ? "text-danger-fg" : "text-warning-fg"
          )}
        >
          {title}
        </p>
        <p className="mt-1 break-words text-sm text-fg">{message}</p>
        <p className="mt-1 text-xs text-fg-muted">{note}</p>
      </div>
    </div>
  )
}

/**
 * The outcome of a confirmed proposal.
 *
 * The three operations answer with different bodies, and the operator needs
 * a different thing from each: a release needs a link to the pipeline that
 * is now running, a service control needs the raw systemctl output, and a
 * swap creation needs the path and the size that were written.
 */
function ExecutionResult({
  result,
  instanceId,
}: {
  result: AiExecuteResult
  instanceId: string
}) {
  if (result.kind === "service_control") {
    const response = result.response
    // The endpoint answers 200 even when the command failed, and then the
    // body carries status "UNKNOWN". The verdict is in the body; the raw
    // output is the only thing that says what actually happened.
    const unknown = response.status === "UNKNOWN"

    return (
      <div
        role="status"
        className={cn(
          "mt-3 flex items-start gap-3 rounded-md p-3.5 ring-1 ring-inset",
          unknown
            ? "bg-danger-soft ring-danger/25"
            : "bg-success-soft ring-success/25"
        )}
      >
        {unknown ? (
          <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-danger-fg" aria-hidden />
        ) : (
          <CheckCircle2
            className="mt-0.5 h-4 w-4 shrink-0 text-success-fg"
            aria-hidden
          />
        )}
        <div className="min-w-0 flex-1">
          <p
            className={cn(
              "text-sm font-semibold",
              unknown ? "text-danger-fg" : "text-success-fg"
            )}
          >
            {unknown
              ? "Couldn't tell whether it worked"
              : `${response.unit} ${response.action} completed`}
          </p>
          {response.output ? (
            <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap break-words rounded-md border border-border/40 bg-surface-sunken p-3 font-mono text-[0.6875rem] leading-relaxed text-fg">
              {response.output}
            </pre>
          ) : null}
          <WarningBlock warnings={response.warnings ?? []} className="mt-2.5" />
        </div>
      </div>
    )
  }

  if (result.kind === "swap_create") {
    const response = result.response

    return (
      <div
        role="status"
        className="mt-3 flex items-start gap-3 rounded-md bg-success-soft p-3.5 ring-1 ring-inset ring-success/25"
      >
        <CheckCircle2
          className="mt-0.5 h-4 w-4 shrink-0 text-success-fg"
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-success-fg">
            Swap space created
          </p>
          <p className="mt-1 text-sm text-fg">
            <span className="font-mono text-[0.8125rem]">{response.path}</span>
            {" · "}
            {response.size_mb} MB
          </p>
          {response.output ? (
            <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap break-words rounded-md border border-border/40 bg-surface-sunken p-3 font-mono text-[0.6875rem] leading-relaxed text-fg">
              {response.output}
            </pre>
          ) : null}
          <WarningBlock warnings={response.warnings ?? []} className="mt-2.5" />
        </div>
      </div>
    )
  }

  const response = result.response

  return (
    <div
      role="status"
      className="mt-3 flex items-start gap-3 rounded-md bg-success-soft p-3.5 ring-1 ring-inset ring-success/25"
    >
      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success-fg" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-success-fg">
          The release has started
        </p>
        <p className="mt-1 text-sm text-fg">
          Commit{" "}
          <span className="font-mono text-[0.8125rem]">{response.sha}</span> is
          running through the pipeline.
        </p>
        <Link
          to={`/instances/${instanceId}/releases?release=${response.action_id}`}
          className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-primary transition-colors duration-200 hover:text-primary-hover"
        >
          <Rocket className="h-3.5 w-3.5" aria-hidden />
          Watch the pipeline
        </Link>
        <WarningBlock warnings={response.warnings ?? []} className="mt-2.5" />
      </div>
    </div>
  )
}
