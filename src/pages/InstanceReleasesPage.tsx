import { useState } from "react"
import { Link, useParams, useSearchParams } from "react-router-dom"
import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { motion, useReducedMotion } from "framer-motion"
import {
  ChevronRight,
  ExternalLink,
  GitCommitHorizontal,
  GitCompare,
  History,
  Rocket,
  RotateCcw,
  Terminal,
  TriangleAlert,
  XCircle,
} from "lucide-react"
import { Card, CardHeader, CardTitle } from "../components/ui/Card"
import { Button } from "../components/ui/Button"
import { Field, Input } from "../components/ui/Input"
import { LoadingPage, LoadingBlock } from "../components/ui/LoadingState"
import { ErrorState } from "../components/ui/ErrorState"
import { EmptyState } from "../components/ui/EmptyState"
import { StatusPill } from "../components/ui/StatusPill"
import { Badge } from "../components/ui/Badge"
import { ConfirmDialog } from "../components/ui/ConfirmDialog"
import { Pagination } from "../components/ui/Pagination"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/Table"
import { ReleaseStageStepper } from "../components/releases/ReleaseStageStepper"
import { ReleaseDiffPanel } from "../components/releases/ReleaseDiffPanel"
import { ReleaseOutputBlock } from "../components/releases/ReleaseOutputBlock"
import { useInstance } from "../queries/instances"
import {
  useCreateRelease,
  useReleaseDetail,
  useReleaseDiff,
  useReleaseHistory,
  useReleaseLog,
  useRollbackRelease,
} from "../queries/releases"
import { normalizeError } from "../api/errors"
import { cn, formatDuration, formatRelative } from "../lib/utils"
import { repoPath } from "../lib/github"
import { isValidCommitSha, RELEASE_STAGE_LABELS } from "../lib/ops-constants"
import { pageVariants, reducedVariants } from "../lib/motion"
import type { ReleaseDetail, ReleaseSummary } from "../api/types"

/**
 * The release pipeline.
 *
 * A release fetches a commit, checks it out, deploys it and restores the
 * branch it came from. It runs over SSH in the background, so this page has
 * three jobs:
 *
 *   1. Show what a release WOULD change, before anyone starts one.
 *   2. Show what a release DID, stage by stage, while it runs and after it
 *      finishes.
 *   3. Let a successful release be rolled back.
 *
 * The selected release lives in the URL (`?release=<actionId>`) rather than in
 * component state, so a release can be linked to and the browser's back
 * button walks the history the operator just looked at.
 */

const PAGE_SIZE = 25

const releaseSchema = z.object({
  sha: z
    .string()
    .trim()
    .min(1, "Enter the commit to deploy")
    .refine(isValidCommitSha, "That does not look like a commit SHA"),
  from: z
    .string()
    .trim()
    .refine(
      (value) => value === "" || isValidCommitSha(value),
      "That does not look like a commit SHA"
    ),
})

type ReleaseForm = z.infer<typeof releaseSchema>

/** The release status as the pill reads it. */
const statusTone: Record<string, string> = {
  PENDING: "pending",
  RUNNING: "running",
  SUCCESS: "success",
  FAILED: "failed",
}

/**
 * How long a release took.
 *
 * The detail response carries no `duration_seconds` — only the list summary
 * does — so the elapsed time is worked out from the two timestamps. A release
 * that has not finished has no end time and therefore no duration.
 */
function releaseDuration(detail: ReleaseDetail | null): number | null {
  if (!detail?.started_at || !detail.completed_at) return null
  const started = Date.parse(detail.started_at)
  const completed = Date.parse(detail.completed_at)
  if (Number.isNaN(started) || Number.isNaN(completed)) return null
  return Math.max(0, Math.round((completed - started) / 1000))
}

/**
 * The GitHub compare link for the commit being deployed.
 *
 * The range mirrors the comparison the preview shows: the commit being
 * deployed is the first half, and the other half is the commit it is
 * compared against — the typed one when the operator gave one, otherwise
 * the instance's branch, and "main" when the instance has no branch either.
 *
 * Nothing is returned until there is a commit to point at, or when the
 * instance has no repository — a link to nowhere is worse than no link.
 */
function buildCompareUrl({
  repo,
  sha,
  from,
  branch,
}: {
  repo: string | null
  sha: string
  from: string
  branch: string | null
}): string | null {
  const path = repo ? repoPath(repo) : ""
  const trimmedSha = sha.trim()
  if (!path || !isValidCommitSha(trimmedSha)) return null

  const trimmedFrom = from.trim()
  // A half-typed commit is not a commit. The form says so; the link waits.
  if (trimmedFrom && !isValidCommitSha(trimmedFrom)) return null

  const target = trimmedFrom || branch?.trim() || "main"
  return `https://github.com/${path}/compare/${trimmedSha}...${target}`
}

export function InstanceReleasesPage() {
  const { id } = useParams<{ id: string }>()
  const [searchParams, setSearchParams] = useSearchParams()
  const reduceMotion = useReducedMotion()

  const instanceQ = useInstance(id)
  const instance = instanceQ.data ?? null
  const isVps = instance?.type === "VPS"

  const selectedId = searchParams.get("release")

  const [page, setPage] = useState(1)
  const historyQ = useReleaseHistory(id, {
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
  })

  const selectRelease = (actionId: string | null) => {
    const next = new URLSearchParams(searchParams)
    if (actionId) next.set("release", actionId)
    else next.delete("release")
    setSearchParams(next)
  }

  if (instanceQ.isLoading) return <LoadingPage label="Loading…" />
  if (instanceQ.isError || !instance) {
    return (
      <ErrorState
        title="We couldn't load this server"
        error={instanceQ.error as Error}
        onRetry={() => instanceQ.refetch()}
      />
    )
  }

  const releases = historyQ.data?.items ?? []
  const total = historyQ.data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

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
        <span className="font-medium text-fg">Releases</span>
      </nav>

      <header>
        <h1 className="text-[1.5rem] font-bold leading-tight text-fg tracking-tight xs:text-[1.625rem] sm:text-[1.75rem]">
          Releases
        </h1>
        <p className="mt-1 text-[0.9375rem] text-fg-muted">
          Deploy a commit to{" "}
          <code className="rounded bg-surface-sunken px-1 py-0.5 font-mono text-[0.8125rem]">
            {instance.github_repo ?? instance.github_branch ?? instance.name}
          </code>
          , watch the pipeline run, and roll back when it goes wrong.
        </p>
      </header>

      {!isVps ? (
        <Card>
          <EmptyState
            icon={Rocket}
            tone="info"
            title="Releases are only available on servers"
            description="Deploying a commit needs a server to run the build on. The release history below still shows anything already recorded against this resource."
          />
        </Card>
      ) : null}

      {selectedId ? (
        <ReleaseDetailSection
          instanceId={instance.id}
          actionId={selectedId}
          isVps={isVps}
          onClose={() => selectRelease(null)}
          onRolledBack={(newId) => selectRelease(newId)}
        />
      ) : null}

      {isVps ? (
        <DeployCommitCard
          instanceId={instance.id}
          githubRepo={instance.github_repo}
          githubBranch={instance.github_branch}
          onStarted={(actionId) => selectRelease(actionId)}
        />
      ) : null}

      <section className="space-y-3">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-fg-muted">
            <History className="h-4 w-4" aria-hidden />
            Release history
          </h2>
          <p className="text-sm text-fg-muted">
            {total === 0
              ? "No releases yet"
              : `${total} release${total === 1 ? "" : "s"}`}
          </p>
        </div>

        {historyQ.isLoading && releases.length === 0 ? (
          <Card>
            <LoadingBlock label="Loading the release history…" className="py-8" />
          </Card>
        ) : historyQ.isError ? (
          <Card>
            <ErrorState
              title="Couldn't load the release history"
              error={historyQ.error as Error}
              onRetry={() => historyQ.refetch()}
              className="py-8"
            />
          </Card>
        ) : releases.length === 0 ? (
          <Card>
            <EmptyState
              icon={GitCommitHorizontal}
              title="No releases yet"
              description="Once a commit is deployed it will appear here, with every stage of the pipeline and what it printed."
            />
          </Card>
        ) : (
          <>
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeader>Type</TableHeader>
                  <TableHeader>Status</TableHeader>
                  <TableHeader>Commit</TableHeader>
                  <TableHeader>Branch</TableHeader>
                  <TableHeader>Started</TableHeader>
                  <TableHeader className="w-24 text-right">Duration</TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {releases.map((release) => (
                  <ReleaseRow
                    key={release.id}
                    release={release}
                    selected={release.id === selectedId}
                    onSelect={() => selectRelease(release.id)}
                  />
                ))}
              </TableBody>
            </Table>
            <Pagination
              page={page}
              totalPages={totalPages}
              onChange={setPage}
            />
          </>
        )}
      </section>
    </motion.div>
  )
}

InstanceReleasesPage.displayName = "InstanceReleasesPage"

/**
 * One row of the release history.
 *
 * The row is a button in everything but name — it selects the release and
 * the detail opens above. A failed release shows its error inline rather
 * than behind a click, because "why did it fail" is the first question
 * anyone asks of a red row.
 */
function ReleaseRow({
  release,
  selected,
  onSelect,
}: {
  release: ReleaseSummary
  selected: boolean
  onSelect: () => void
}) {
  const isRollback = release.action_type === "ROLLBACK"

  return (
    <TableRow
      onClick={onSelect}
      className={cn(selected ? "bg-primary/[0.06]" : undefined)}
    >
      <TableCell>
        <Badge tone={isRollback ? "warning" : "primary"}>
          {isRollback ? "Rollback" : "Release"}
        </Badge>
      </TableCell>
      <TableCell>
        <StatusPill
          status={statusTone[release.status] ?? release.status}
          size="sm"
        />
        {release.status === "FAILED" && release.error_message ? (
          <p className="mt-1 max-w-xs truncate text-xs text-danger-fg">
            {release.error_message}
          </p>
        ) : null}
      </TableCell>
      <TableCell>
        <code className="font-mono text-xs text-fg">
          {release.sha ? release.sha.slice(0, 8) : "—"}
        </code>
      </TableCell>
      <TableCell>
        <span className="text-xs text-fg-muted">{release.branch || "—"}</span>
      </TableCell>
      <TableCell>
        <span className="text-xs text-fg-muted">
          {formatRelative(release.started_at)}
        </span>
      </TableCell>
      <TableCell className="text-right text-xs tabular-nums text-fg-muted">
        {release.duration_seconds != null
          ? formatDuration(release.duration_seconds)
          : "—"}
      </TableCell>
    </TableRow>
  )
}

/**
 * Preview a commit, then deploy it.
 *
 * The preview comes first on purpose: an operator who can see what a commit
 * changes is far less likely to deploy the wrong one. The deploy button only
 * appears once a comparison has loaded, so it can never be pressed against a
 * commit the server has not yet looked at.
 */
function DeployCommitCard({
  instanceId,
  githubRepo,
  githubBranch,
  onStarted,
}: {
  instanceId: string
  githubRepo: string | null
  githubBranch: string | null
  onStarted: (actionId: string) => void
}) {
  const [diffSha, setDiffSha] = useState<string | undefined>(undefined)
  const [diffFrom, setDiffFrom] = useState<string | undefined>(undefined)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [failure, setFailure] = useState<string | null>(null)

  const diffQ = useReleaseDiff(instanceId, diffSha, diffFrom)
  const createRelease = useCreateRelease()

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ReleaseForm>({
    resolver: zodResolver(releaseSchema),
    defaultValues: { sha: "", from: "" },
  })

  // The typed values, watched so the GitHub link appears as soon as there is
  // a commit to point at — the operator does not have to preview first.
  const typedSha = useWatch({ control, name: "sha" })
  const typedFrom = useWatch({ control, name: "from" })

  const compareUrl = buildCompareUrl({
    repo: githubRepo,
    sha: typedSha,
    from: typedFrom,
    branch: githubBranch,
  })

  const preview = handleSubmit((values) => {
    setFailure(null)
    setDiffSha(values.sha)
    setDiffFrom(values.from === "" ? undefined : values.from)
  })

  const start = async () => {
    setFailure(null)
    try {
      const accepted = await createRelease.mutateAsync({
        instanceId,
        sha: diffSha as string,
      })
      setConfirmOpen(false)
      reset({ sha: "", from: "" })
      setDiffSha(undefined)
      setDiffFrom(undefined)
      onStarted(accepted.action_id)
    } catch (err) {
      // Verbatim: the server's refusal names the reason.
      setFailure(normalizeError(err).message)
      setConfirmOpen(false)
    }
  }

  const diff = diffQ.data
  const canDeploy = Boolean(diff) && !diffQ.isError

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary-soft text-primary">
            <GitCompare className="h-5 w-5" aria-hidden />
          </div>
          <div className="min-w-0">
            <CardTitle>Deploy a commit</CardTitle>
            <p className="mt-1 text-sm text-fg-muted">
              Compare a commit against what is deployed now, then release it.
              The comparison is read-only — nothing changes until you deploy.
            </p>
          </div>
        </div>
      </CardHeader>

      <form onSubmit={preview} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field
            label="Commit"
            htmlFor="release-sha"
            required
            error={errors.sha?.message}
            hint="The commit to deploy. A short SHA is fine."
          >
            <Input
              id="release-sha"
              placeholder="e.g. 4f9a2c1"
              autoComplete="off"
              spellCheck={false}
              className="font-mono"
              {...register("sha")}
            />
          </Field>

          <Field
            label="Compare from"
            htmlFor="release-from"
            error={errors.from?.message}
            hint="Optional. Defaults to the commit that is deployed now."
          >
            <Input
              id="release-from"
              placeholder="e.g. 8b3d0f7"
              autoComplete="off"
              spellCheck={false}
              className="font-mono"
              {...register("from")}
            />
          </Field>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" variant="secondary" leftIcon={GitCompare}>
            Preview changes
          </Button>
          {compareUrl ? (
            <a
              href={compareUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
            >
              <ExternalLink className="h-4 w-4" aria-hidden />
              Compare on GitHub
            </a>
          ) : null}
        </div>
      </form>

      {diffSha ? (
        <div className="mt-6 border-t border-border/50 pt-5">
          <ReleaseDiffPanel
            diff={diff}
            loading={diffQ.isFetching}
            error={diffQ.isError ? normalizeError(diffQ.error) : null}
            onRetry={() => diffQ.refetch()}
          />

          {canDeploy ? (
            <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-border/50 pt-5">
              <Button
                variant="primary"
                leftIcon={Rocket}
                onClick={() => setConfirmOpen(true)}
              >
                Deploy this commit
              </Button>
              <p className="text-sm text-fg-muted">
                Deploys{" "}
                <code className="font-mono text-[0.8125rem]">
                  {diff?.resolved_sha || diffSha}
                </code>{" "}
                to this server.
              </p>
            </div>
          ) : null}
        </div>
      ) : null}

      {failure ? (
        <div
          role="alert"
          className="mt-5 flex items-start gap-3 rounded-md bg-danger-soft p-4 ring-1 ring-inset ring-danger/25"
        >
          <XCircle
            className="mt-0.5 h-5 w-5 shrink-0 text-danger-fg"
            aria-hidden
          />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-danger-fg">
              The release wasn't started
            </p>
            <p className="mt-1 break-words text-sm text-fg">{failure}</p>
          </div>
        </div>
      ) : null}

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={start}
        title="Deploy this commit?"
        description={`The pipeline will fetch, check out and deploy ${
          diff?.resolved_sha || diffSha || "this commit"
        } on the server, then restore the branch it came from. It runs in the background — you can follow it on this page.`}
        confirmLabel="Yes, deploy"
        isLoading={createRelease.isPending}
      />
    </Card>
  )
}

/**
 * One release, in full.
 *
 * The stepper is the headline; the outputs are the evidence. A stage's own
 * output is shown under the stepper rather than inside it, because the
 * stepper is a picture of the pipeline and the output is a wall of text —
 * mixing them makes neither readable.
 */
function ReleaseDetailSection({
  instanceId,
  actionId,
  isVps,
  onClose,
  onRolledBack,
}: {
  instanceId: string
  actionId: string
  isVps: boolean
  onClose: () => void
  onRolledBack: (actionId: string) => void
}) {
  const detailQ = useReleaseDetail(instanceId, actionId)
  const rollback = useRollbackRelease()

  const [showLog, setShowLog] = useState(false)
  const [rollbackError, setRollbackError] = useState<string | null>(null)
  const [confirmRollback, setConfirmRollback] = useState(false)

  const logQ = useReleaseLog(instanceId, actionId, showLog)

  const detail = detailQ.data ?? null
  const isRollback = detail?.action_type === "ROLLBACK"
  const isTerminal =
    detail?.status === "SUCCESS" || detail?.status === "FAILED"

  // The detail response has no duration of its own — only the list summary
  // does — so the elapsed time is computed from the two timestamps here.
  const duration = releaseDuration(detail)

  const runRollback = async () => {
    setRollbackError(null)
    try {
      const accepted = await rollback.mutateAsync({
        instanceId,
        actionId,
      })
      setConfirmRollback(false)
      onRolledBack(accepted.action_id)
    } catch (err) {
      // Verbatim: the server's 409 is the diagnosis.
      setRollbackError(normalizeError(err).message)
      setConfirmRollback(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle>Pipeline</CardTitle>
            {detail ? (
              <StatusPill
                status={statusTone[detail.status] ?? detail.status}
                size="sm"
              />
            ) : null}
            {isRollback ? <Badge tone="warning">Rollback</Badge> : null}
            {detail?.rollback_of ? (
              <Badge tone="neutral">of {detail.rollback_of.slice(0, 8)}</Badge>
            ) : null}
          </div>
          {detail ? (
            <p className="mt-1 text-sm text-fg-muted">
              <code className="font-mono text-[0.8125rem]">
                {detail.sha ? detail.sha.slice(0, 8) : "—"}
              </code>
              {detail.branch ? (
                <>
                  {" on "}
                  <span className="font-mono text-[0.8125rem]">
                    {detail.branch}
                  </span>
                </>
              ) : null}
              {" · started "}
              {formatRelative(detail.started_at)}
              {duration != null ? ` · took ${formatDuration(duration)}` : ""}
            </p>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {isVps && !isRollback && isTerminal ? (
            <Button
              variant="outline"
              size="sm"
              leftIcon={RotateCcw}
              onClick={() => setConfirmRollback(true)}
            >
              Roll back
            </Button>
          ) : null}
          <Button variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </CardHeader>

      {detailQ.isLoading && !detail ? (
        <LoadingBlock label="Loading the pipeline…" className="py-8" />
      ) : detailQ.isError || !detail ? (
        <ErrorState
          title="Couldn't load this release"
          error={detailQ.error as Error}
          onRetry={() => detailQ.refetch()}
          className="py-8"
        />
      ) : (
        <div className="space-y-6">
          <ReleaseStageStepper stages={detail.stages ?? []} />

          {detail.error_message ? (
            <div className="flex items-start gap-3 rounded-md bg-danger-soft p-4 ring-1 ring-inset ring-danger/25">
              <TriangleAlert
                className="mt-0.5 h-5 w-5 shrink-0 text-danger-fg"
                aria-hidden
              />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-danger-fg">
                  The release failed
                </p>
                <p className="mt-1 break-words text-sm text-fg">
                  {detail.error_message}
                </p>
              </div>
            </div>
          ) : null}

          {rollbackError ? (
            <div
              role="alert"
              className="flex items-start gap-3 rounded-md bg-danger-soft p-4 ring-1 ring-inset ring-danger/25"
            >
              <XCircle
                className="mt-0.5 h-5 w-5 shrink-0 text-danger-fg"
                aria-hidden
              />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-danger-fg">
                  The rollback was refused
                </p>
                <p className="mt-1 break-words text-sm text-fg">
                  {rollbackError}
                </p>
              </div>
            </div>
          ) : null}

          <StageOutputs detail={detail} />

          <div className="border-t border-border/50 pt-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-fg-muted">
                <Terminal className="h-3.5 w-3.5" aria-hidden />
                Build log
              </p>
              <Button
                variant="ghost"
                size="sm"
                leftIcon={Terminal}
                onClick={() => setShowLog((value) => !value)}
                isLoading={showLog && logQ.isFetching}
              >
                {showLog ? "Hide the log" : "Show the log"}
              </Button>
            </div>

            {showLog ? (
              <div className="mt-3">
                {logQ.isError ? (
                  <ErrorState
                    title="Couldn't read the log"
                    error={logQ.error as Error}
                    onRetry={() => logQ.refetch()}
                    className="py-6"
                  />
                ) : logQ.isFetching && !logQ.data ? (
                  <LoadingBlock label="Fetching the log…" className="py-6" />
                ) : (
                  <ReleaseOutputBlock
                    output={logQ.data ?? ""}
                    copyLabel="Copy log"
                    emptyMessage="(the log is empty)"
                  />
                )}
              </div>
            ) : null}
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmRollback}
        onClose={() => setConfirmRollback(false)}
        onConfirm={runRollback}
        title="Roll back to this release?"
        description={`This re-deploys the commit ${
          detail?.sha ? detail.sha.slice(0, 8) : ""
        } on the server. The rollback runs the same pipeline as a release, and it is recorded in the history alongside it.`}
        confirmLabel="Yes, roll back"
        isLoading={rollback.isPending}
      />
    </Card>
  )
}

/**
 * What each stage printed.
 *
 * A stage's output is the command's stdout, and a stage may also carry the
 * script's own `STAGE:` markers split into named sections. When a stage has
 * named sections they are shown as sections — with the text that came before
 * the first marker shown above them — and the raw output is not repeated
 * alongside. A stage with no markers shows its output whole.
 *
 * Nothing is dropped either way: the text before the first marker is always
 * rendered, and the complete transcript is one button away.
 */
function StageOutputs({ detail }: { detail: ReleaseDetail }) {
  const stages = detail.stages ?? []

  const blocks = stages.flatMap((stage) => {
    const label = RELEASE_STAGE_LABELS[stage.name] ?? stage.name
    const subStages = stage.sub_stages ?? []
    const named = subStages.filter((section) => section.name !== "")
    const preamble = subStages.find((section) => section.name === "")

    if (named.length > 0) {
      return [
        <div key={stage.name} className="space-y-3">
          {preamble && preamble.output ? (
            <ReleaseOutputBlock
              title={`${label} · before the first section`}
              output={preamble.output}
              copyLabel="Copy"
            />
          ) : null}
          {named.map((section, index) => (
            <ReleaseOutputBlock
              key={`${section.name}-${index}`}
              title={`${label} · ${section.name}`}
              output={section.output}
              copyLabel="Copy"
            />
          ))}
        </div>,
      ]
    }

    if (stage.output) {
      return [
        <ReleaseOutputBlock
          key={stage.name}
          title={label}
          output={stage.output}
          copyLabel="Copy"
        />,
      ]
    }

    return []
  })

  if (blocks.length === 0) {
    return (
      <p className="text-sm text-fg-muted">
        This release did not report any stage output.
      </p>
    )
  }

  return <div className="space-y-5">{blocks}</div>
}
