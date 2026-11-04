import { useEffect, useRef, useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { Bot, ChevronRight, Loader2, Send, TriangleAlert, User } from "lucide-react"
import { motion, useReducedMotion } from "framer-motion"
import { toast } from "sonner"
import { Card } from "../components/ui/Card"
import { Button } from "../components/ui/Button"
import { Textarea } from "../components/ui/Input"
import { EmptyState } from "../components/ui/EmptyState"
import { ErrorState } from "../components/ui/ErrorState"
import { LoadingPage } from "../components/ui/LoadingState"
import { AiChatMessage } from "../components/aiops/AiChatMessage"
import {
  AiProposalCard,
  type AiProposalOutcome,
} from "../components/aiops/AiProposalCard"
import { useInstance } from "../queries/instances"
import { useAiChat, useExecuteAiProposal } from "../queries/aiops"
import { normalizeError } from "../api/errors"
import { pageVariants, reducedVariants } from "../lib/motion"
import { buildMessageWithHistory } from "../lib/copilot-history"
import type { AiChatResponse, AiProposal } from "../api/types"

/**
 * The ops copilot.
 *
 * The console answers a question about one instance and may propose actions
 * for it. Three rules shape this page:
 *
 *   - **Nothing happens without a person.** A proposal is a card that says so
 *     and waits. The card is the only place a write can be started from this
 *     page.
 *   - **A proposal is used up the moment it is run.** The server consumes it
 *     atomically before it does anything, so a second attempt is a 404 and a
 *     refusal after the consume burns it too. The page never offers a retry
 *     it knows would fail, and it never runs an operation twice.
 *   - **An unconfigured console is not an outage.** The platform can be
 *     perfectly healthy with no model endpoint configured, so that is a
 *     configuration state and it reads like one.
 */

interface Turn {
  id: string
  question: string
  answer: AiChatResponse | null
  error: string | null
  pending: boolean
}

/**
 * Questions the console can actually answer.
 *
 * Each one maps onto a read the console knows how to gather: the disk
 * report, the service inventory, the swap status, the release history. They
 * are offered because they are the questions the console is built for, not
 * because they read well on a button.
 */
const SUGGESTIONS = [
  "Where did the disk space go?",
  "Which services are running?",
  "Is the swap space persistent?",
  "What did we deploy last?",
]

/**
 * The route entry point. The transcript is keyed by instance id, so moving
 * from one instance's copilot to another starts a fresh thread instead of
 * carrying the old one (and its history) across.
 */
export function InstanceCopilotPage() {
  const { id } = useParams<{ id: string }>()
  return <CopilotThread key={id ?? ""} />
}

function CopilotThread() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const reduceMotion = useReducedMotion()

  const instanceQ = useInstance(id)

  const chat = useAiChat()
  const execute = useExecuteAiProposal()

  const [turns, setTurns] = useState<Turn[]>([])
  const [outcomes, setOutcomes] = useState<Record<string, AiProposalOutcome>>(
    {}
  )
  const [dropped, setDropped] = useState<Record<string, true>>({})
  const [unavailable, setUnavailable] = useState(false)
  const [draft, setDraft] = useState("")
  const [busyProposal, setBusyProposal] = useState<string | null>(null)

  const turnSeq = useRef(0)
  const endRef = useRef<HTMLDivElement | null>(null)

  // A new answer is below the fold once the transcript has grown, so the
  // newest turn is brought into view as it arrives.
  useEffect(() => {
    endRef.current?.scrollIntoView({
      behavior: reduceMotion ? "auto" : "smooth",
      block: "nearest",
    })
  }, [turns.length, reduceMotion])

  const instance = instanceQ.data ?? null

  const ask = async (question: string, clearDraft = true) => {
    const trimmed = question.trim()
    if (!trimmed || !id || chat.isPending) return

    turnSeq.current += 1
    const turnId = `turn-${turnSeq.current}`
    setTurns((prev) => [
      ...prev,
      { id: turnId, question: trimmed, answer: null, error: null, pending: true },
    ])
    if (clearDraft) setDraft("")

    try {
      // The server only sees one message per request, so the earlier turns
      // travel inside it. `turns` here is the transcript before this question.
      const answer = await chat.mutateAsync({
        instanceId: id,
        message: buildMessageWithHistory(turns, trimmed),
      })
      setTurns((prev) =>
        prev.map((turn) =>
          turn.id === turnId ? { ...turn, answer, pending: false } : turn
        )
      )
    } catch (err) {
      const apiError = normalizeError(err)
      // A 503 means the platform has no model endpoint configured. That is a
      // configuration state, so the page says the copilot is unavailable
      // rather than showing a failure the operator cannot act on.
      if (apiError.status === 503) setUnavailable(true)
      setTurns((prev) =>
        prev.map((turn) =>
          turn.id === turnId
            ? { ...turn, error: apiError.message, pending: false }
            : turn
        )
      )
    }
  }

  const dropProposal = (proposalId: string) => {
    setDropped((prev) => ({ ...prev, [proposalId]: true }))
  }

  const confirmProposal = async (proposal: AiProposal) => {
    if (!id) return
    setBusyProposal(proposal.id)

    try {
      const result = await execute.mutateAsync({
        proposalId: proposal.id,
        instanceId: id,
      })
      setOutcomes((prev) => ({ ...prev, [proposal.id]: { kind: "done", result } }))
    } catch (err) {
      const apiError = normalizeError(err)

      if (apiError.status === 404) {
        // The proposal was already consumed — by another tab, or by an
        // attempt that never came back. The server refuses it rather than
        // running it twice, so the card is dropped and never retried.
        dropProposal(proposal.id)
        toast.error("That proposal was already used")
      } else if (apiError.status === 403) {
        // The instance is no longer the caller's, and the proposal was
        // consumed on the way to that answer.
        dropProposal(proposal.id)
        toast.error("That proposal is no longer available")
      } else if (apiError.status === 0 || apiError.status === 401) {
        // The request never reached the server, so the proposal is still
        // waiting and the operator may try again.
        setOutcomes((prev) => ({
          ...prev,
          [proposal.id]: { kind: "retryable", message: apiError.message },
        }))
      } else {
        // The server consumes a proposal before it runs it, so a refusal
        // from here on has already spent it.
        setOutcomes((prev) => ({
          ...prev,
          [proposal.id]: { kind: "spent", message: apiError.message },
        }))
      }
    } finally {
      setBusyProposal(null)
    }
  }

  if (instanceQ.isLoading) return <LoadingPage label="Loading…" />
  if (instanceQ.isError || !instance) {
    return (
      <ErrorState
        title="We couldn't load this instance"
        error={instanceQ.error as Error}
        onRetry={() => instanceQ.refetch()}
      />
    )
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
        <span className="font-medium text-fg">Copilot</span>
      </nav>

      <header>
        <h1 className="text-[1.5rem] font-bold leading-tight text-fg tracking-tight xs:text-[1.625rem] sm:text-[1.75rem]">
          Copilot
        </h1>
        <p className="mt-1 text-[0.9375rem] text-fg-muted">
          Ask about {instance.name} — where the disk space went, which units
          are running, what the last release did. It reads the host and the
          release history, and proposes changes for you to confirm. It never
          changes anything on its own.
        </p>
      </header>

      {unavailable && turns.length === 0 ? (
        <Card>
          <EmptyState
            icon={Bot}
            tone="warning"
            title="The copilot is not available"
            description="This platform has no model endpoint configured, so the copilot cannot answer questions. Everything else on the instance still works."
            action={{
              label: "Back to overview",
              onClick: () => navigate(`/instances/${instance.id}`),
              variant: "outline",
            }}
          />
        </Card>
      ) : null}

      {unavailable && turns.length > 0 ? (
        <Card accent="warning" padding="sm">
          <div className="flex items-start gap-3">
            <TriangleAlert
              className="mt-0.5 h-4 w-4 shrink-0 text-warning-fg"
              aria-hidden
            />
            <p className="min-w-0 text-sm text-fg">
              The copilot is not available — this platform has no model
              endpoint configured. The answers below were already given.
            </p>
          </div>
        </Card>
      ) : null}

      {turns.length === 0 && !unavailable ? (
        <Card>
          <EmptyState
            icon={Bot}
            tone="accent"
            title={`Ask about ${instance.name}`}
            description="The copilot reads the host over SSH and the release history from the ledger, then answers in plain language. Anything it proposes stays a proposal until you confirm it."
          >
            <div className="flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => ask(suggestion, false)}
                  disabled={chat.isPending}
                  className="rounded-full border border-border/60 bg-surface px-3.5 py-1.5 text-sm text-fg-muted transition-[background-color,border-color,color] duration-200 hover:border-primary/40 hover:bg-primary-soft hover:text-primary-soft-fg disabled:pointer-events-none disabled:opacity-50"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </EmptyState>
        </Card>
      ) : null}

      {turns.length > 0 ? (
        <div className="space-y-8">
          {turns.map((turn) => {
            const proposals = (turn.answer?.proposed_actions ?? []).filter(
              (proposal) => !dropped[proposal.id]
            )

            return (
              <div key={turn.id} className="space-y-4">
                <div className="flex items-start gap-2.5">
                  <span
                    className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary-soft-fg"
                    aria-hidden
                  >
                    <User className="h-3.5 w-3.5" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-fg">You asked</p>
                    <p className="mt-1 whitespace-pre-wrap text-[0.9375rem] leading-relaxed text-fg">
                      {turn.question}
                    </p>
                  </div>
                </div>

                {turn.pending ? (
                  <div className="flex items-center gap-2.5 pl-10 text-sm text-fg-muted">
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    Reading the host and thinking…
                  </div>
                ) : null}

                {turn.error ? (
                  <div
                    role="alert"
                    className="ml-10 flex items-start gap-3 rounded-md bg-danger-soft p-4 ring-1 ring-inset ring-danger/25"
                  >
                    <TriangleAlert
                      className="mt-0.5 h-4 w-4 shrink-0 text-danger-fg"
                      aria-hidden
                    />
                    <p className="min-w-0 break-words text-sm text-fg">
                      {turn.error}
                    </p>
                  </div>
                ) : null}

                {turn.answer ? (
                  <>
                    <div className="pl-10">
                      <AiChatMessage
                        reply={turn.answer.reply}
                        notes={turn.answer.notes}
                        context={turn.answer.context}
                        modelCalls={turn.answer.model_calls}
                      />
                    </div>

                    {proposals.length > 0 ? (
                      <div className="space-y-3 pl-10">
                        {proposals.map((proposal) => (
                          <AiProposalCard
                            key={proposal.id}
                            proposal={proposal}
                            instanceId={instance.id}
                            outcome={outcomes[proposal.id] ?? null}
                            busy={busyProposal === proposal.id}
                            onConfirm={confirmProposal}
                          />
                        ))}
                      </div>
                    ) : null}
                  </>
                ) : null}
              </div>
            )
          })}
          <div ref={endRef} aria-hidden />
        </div>
      ) : null}

      {!unavailable ? (
        <Card>
          <form
            onSubmit={(event) => {
              event.preventDefault()
              void ask(draft)
            }}
          >
            <label
              htmlFor="copilot-question"
              className="text-[0.8125rem] font-medium text-fg-muted"
            >
              Ask about this instance
            </label>
            <Textarea
              id="copilot-question"
              rows={3}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault()
                  void ask(draft)
                }
              }}
              placeholder="Why did the last release fail?"
              className="mt-1.5"
              disabled={chat.isPending}
            />
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs text-fg-subtle">
                Enter to send, Shift+Enter for a new line. The thread clears
                when you refresh the page.
              </span>
              <Button
                type="submit"
                leftIcon={Send}
                isLoading={chat.isPending}
                disabled={!draft.trim()}
              >
                Ask
              </Button>
            </div>
          </form>
        </Card>
      ) : null}
    </motion.div>
  )
}

InstanceCopilotPage.displayName = "InstanceCopilotPage"
