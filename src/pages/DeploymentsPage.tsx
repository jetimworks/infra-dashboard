import { useMemo, useRef, useState, type ReactNode } from "react"
import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useQueryClient } from "@tanstack/react-query"
import { Link } from "react-router-dom"
import {
  ChevronRight,
  GitBranch,
  Globe,
  History,
  Plus,
  RefreshCw,
  Rocket,
  Server,
  Trash2,
} from "lucide-react"
import { motion, useReducedMotion } from "framer-motion"
import { toast } from "sonner"
import { Card } from "../components/ui/Card"
import { Button } from "../components/ui/Button"
import { Badge } from "../components/ui/Badge"
import { Drawer } from "../components/ui/Drawer"
import { Field, Input } from "../components/ui/Input"
import { StatusPill } from "../components/ui/StatusPill"
import { ConfirmDialog } from "../components/ui/ConfirmDialog"
import { EmptyState } from "../components/ui/EmptyState"
import { ErrorState } from "../components/ui/ErrorState"
import { LoadingPage } from "../components/ui/LoadingState"
import {
  useCreateDeployment,
  useDeployment,
  useDeployments,
  useDeleteDeployment,
  useRedeployDeployment,
} from "../queries/deployments"
import { useInstances } from "../queries/instances"
import { pageVariants, reducedVariants } from "../lib/motion"
import { qk } from "../lib/query-keys"
import { formatDate, formatRelative } from "../lib/utils"
import type {
  CreateDeploymentInput,
  Deployment,
  DeploymentFramework,
  Instance,
} from "../api/types"

/**
 * The deployments page.
 *
 * A deployment is an application running on a server, built from a git
 * repository. Three things about the backend shape this page:
 *
 *   - **The request body is camelCase** — `instanceId`, `gitRepo` — while
 *     the deployment object itself is snake_case. The forms are written to
 *     match the endpoint, not to match the object.
 *   - **A port is required for `nextjs` and `static`** and the backend
 *     refuses the create without one. The form asks for it only for those
 *     two frameworks, so the field appears exactly when it means something.
 *   - **Undeploying is asynchronous.** The endpoint answers 202 and the row
 *     only leaves the list once the background job marks it deleted, so the
 *     page says "Removing" and watches for it rather than pretending the
 *     work is already done.
 */

const FRAMEWORK_LABELS: Record<string, string> = {
  react: "React",
  vue: "Vue",
  angular: "Angular",
  nextjs: "Next.js",
  static: "Static site",
}

const FRAMEWORK_OPTIONS: { value: DeploymentFramework; label: string }[] = [
  { value: "react", label: "React" },
  { value: "vue", label: "Vue" },
  { value: "angular", label: "Angular" },
  { value: "nextjs", label: "Next.js" },
  { value: "static", label: "Static site" },
]

const statusTone: Record<string, string> = {
  PENDING: "pending",
  RUNNING: "running",
  SUCCESS: "success",
  FAILED: "failed",
  DELETED: "inactive",
}

/** Frameworks the platform proxies to a port. */
const NEEDS_PORT: DeploymentFramework[] = ["nextjs", "static"]

const deploymentSchema = z
  .object({
    instanceId: z.string().min(1, "Choose the server to deploy to"),
    domain: z.string().trim().min(1, "Enter the domain the app will serve"),
    gitRepo: z.string().trim().min(1, "Enter the repository to deploy from"),
    framework: z.enum(["react", "vue", "angular", "nextjs", "static"]),
    branch: z.string().trim().min(1, "Enter the branch to deploy"),
    port: z.string().optional(),
  })
  .superRefine((values, ctx) => {
    // Next.js and static sites are served by a process on the host, so the
    // platform has to know which port to point the proxy at. The backend
    // refuses the create without one; the form asks first.
    if (!NEEDS_PORT.includes(values.framework)) return

    const port = Number(values.port)
    if (
      !values.port?.trim() ||
      !Number.isInteger(port) ||
      port < 1 ||
      port > 65535
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["port"],
        message: "Enter the port the app listens on",
      })
    }
  })

type DeploymentForm = z.infer<typeof deploymentSchema>

/**
 * The deployments, grouped by domain.
 *
 * A redeploy starts a NEW deployment row for the same domain — the server
 * keeps one row per run — so the raw list holds several rows for one
 * application. Grouping them keeps the page answering the question the
 * operator is actually asking ("what is running for this domain now?")
 * while the earlier runs stay visible underneath instead of being hidden.
 */
interface DeploymentGroup {
  current: Deployment
  previous: Deployment[]
}

function groupByDomain(deployments: Deployment[]): DeploymentGroup[] {
  const sorted = [...deployments].sort(
    (a, b) => Date.parse(b.created_at) - Date.parse(a.created_at)
  )

  const byDomain = new Map<string, Deployment[]>()
  for (const deployment of sorted) {
    const runs = byDomain.get(deployment.domain)
    if (runs) runs.push(deployment)
    else byDomain.set(deployment.domain, [deployment])
  }

  return [...byDomain.values()].map((runs) => ({
    current: runs[0],
    previous: runs.slice(1),
  }))
}

export function DeploymentsPage() {
  const reduceMotion = useReducedMotion()
  const qc = useQueryClient()

  const [createOpen, setCreateOpen] = useState(false)
  const [detailId, setDetailId] = useState<string | null>(null)
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [pendingRemoval, setPendingRemoval] = useState<Deployment | null>(null)

  // The id of the removal in flight. The list query polls for it so the row
  // disappears the moment the server has actually finished removing it.
  const removingRef = useRef<string | null>(null)

  const deploymentsQ = useDeployments({ pollingFor: removingId })
  const instancesQ = useInstances()

  const deployments = deploymentsQ.data ?? []
  const groups = useMemo(
    () => groupByDomain(deploymentsQ.data ?? []),
    [deploymentsQ.data]
  )

  const servers = useMemo(
    () => (instancesQ.data ?? []).filter((instance) => instance.type === "VPS"),
    [instancesQ.data]
  )
  const serverNames = useMemo(() => {
    const names = new Map<string, string>()
    for (const instance of instancesQ.data ?? []) {
      names.set(instance.id, instance.name)
    }
    return names
  }, [instancesQ.data])

  const redeploy = useRedeployDeployment()
  const remove = useDeleteDeployment()

  const handleRedeploy = (deployment: Deployment) => {
    // `mutate` rather than `mutateAsync`: the hook already reports both
    // outcomes, and the async form would leave an unhandled rejection
    // behind on every failure.
    redeploy.mutate(deployment.id)
  }

  const handleRemove = () => {
    const target = pendingRemoval
    if (!target) return

    setPendingRemoval(null)
    removingRef.current = target.id
    setRemovingId(target.id)

    remove.mutate(target.id, {
      onError: () => {
        // The hook has already shown the refusal; the row is still there,
        // so it must stop claiming to be on its way out.
        removingRef.current = null
        setRemovingId(null)
      },
      onSuccess: () => {
        // The undeploy runs on the server in the background. If it has not
        // finished in a minute the row is still there, and saying "Removing"
        // forever would be a lie — so the label goes back to normal and the
        // operator is told the work is still going. The cache is read at the
        // moment the timer fires, because by then the row may already be
        // gone and there would be nothing to complain about.
        window.setTimeout(() => {
          if (removingRef.current !== target.id) return
          const rows =
            qc.getQueryData<Deployment[]>(qk.deployments()) ?? []
          if (!rows.some((row) => row.id === target.id)) return
          removingRef.current = null
          setRemovingId(null)
          toast.error(
            "The undeploy is taking longer than expected. The deployment is still listed."
          )
        }, 60_000)
      },
    })
  }

  if (deploymentsQ.isLoading) return <LoadingPage label="Loading deployments…" />
  if (deploymentsQ.isError) {
    return (
      <ErrorState
        title="We couldn't load your deployments"
        error={deploymentsQ.error as Error}
        onRetry={() => deploymentsQ.refetch()}
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
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-[1.5rem] font-bold leading-tight text-fg tracking-tight xs:text-[1.625rem] sm:text-[1.75rem]">
            Deployments
          </h1>
          <p className="mt-1 text-[0.9375rem] text-fg-muted">
            The applications running on your servers, and where each one came
            from. Redeploying a domain starts a fresh run of it.
          </p>
        </div>
        <Button
          variant="primary"
          leftIcon={Plus}
          onClick={() => setCreateOpen(true)}
          disabled={servers.length === 0}
        >
          New deployment
        </Button>
      </header>

      {servers.length === 0 && !instancesQ.isLoading ? (
        <Card accent="warning" padding="sm">
          <p className="text-sm text-fg">
            Deployments run on servers, and there are no servers on this
            account yet. Add one first and it will show up here.
          </p>
        </Card>
      ) : null}

      {groups.length === 0 ? (
        <Card>
          <EmptyState
            icon={Rocket}
            tone="accent"
            title="Nothing deployed yet"
            description="Point a git repository at a server and the platform builds it, serves it on a domain, and keeps track of it here."
            action={
              servers.length > 0
                ? {
                    label: "Deploy an application",
                    onClick: () => setCreateOpen(true),
                    icon: Plus,
                  }
                : undefined
            }
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {groups.map((group) => (
            <DeploymentCard
              key={group.current.id}
              group={group}
              serverName={serverNames.get(group.current.instance_id)}
              removing={removingId === group.current.id}
              busy={redeploy.isPending}
              onOpen={() => setDetailId(group.current.id)}
              onRedeploy={() => handleRedeploy(group.current)}
              onRemove={() => setPendingRemoval(group.current)}
            />
          ))}
        </div>
      )}

      <DeploymentCreateDrawer
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        servers={servers}
      />

      <DeploymentDetailDrawer
        id={detailId}
        serverName={
          detailId
            ? serverNames.get(
                deployments.find((d) => d.id === detailId)?.instance_id ?? ""
              )
            : undefined
        }
        onClose={() => setDetailId(null)}
        onRedeploy={(deployment) => handleRedeploy(deployment)}
        onRemove={(deployment) => {
          setDetailId(null)
          setPendingRemoval(deployment)
        }}
      />

      <ConfirmDialog
        open={pendingRemoval !== null}
        onClose={() => setPendingRemoval(null)}
        title="Remove this deployment?"
        description={
          pendingRemoval
            ? `${pendingRemoval.domain} will be undeployed from ${serverNames.get(pendingRemoval.instance_id) ?? "the server"} — the app directory and its nginx configuration are removed.`
            : ""
        }
        confirmLabel="Remove deployment"
        tone="danger"
        requireCheckbox
        checkboxLabel="I understand this removes the application from the server"
        isLoading={remove.isPending}
        onConfirm={handleRemove}
      />
    </motion.div>
  )
}

DeploymentsPage.displayName = "DeploymentsPage"

/**
 * One application, and the runs behind it.
 *
 * The newest run is the one the page leads with; the earlier runs sit
 * underneath as a short history. That history is not decoration — a redeploy
 * leaves the old row behind, and an operator comparing two runs needs to see
 * that they are two runs and not two applications.
 */
function DeploymentCard({
  group,
  serverName,
  removing,
  busy,
  onOpen,
  onRedeploy,
  onRemove,
}: {
  group: DeploymentGroup
  serverName?: string
  removing: boolean
  busy: boolean
  onOpen: () => void
  onRedeploy: () => void
  onRemove: () => void
}) {
  const { current, previous } = group

  return (
    <Card padding="md" className="flex flex-col">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Globe className="h-4 w-4 shrink-0 text-fg-subtle" aria-hidden />
            <p className="truncate font-mono text-[0.9375rem] font-medium text-fg">
              {current.domain}
            </p>
          </div>
          <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-fg-muted">
            <Badge tone="neutral">
              {FRAMEWORK_LABELS[current.framework] ?? current.framework}
            </Badge>
            <span className="inline-flex items-center gap-1">
              <GitBranch className="h-3 w-3" aria-hidden />
              <span className="font-mono">{current.branch}</span>
            </span>
          </p>
        </div>
        {removing ? (
          <StatusPill status="pending" label="Removing" size="sm" />
        ) : (
          <StatusPill
            status={statusTone[current.status] ?? current.status}
            size="sm"
          />
        )}
      </div>

      <dl className="mt-4 space-y-1.5 border-t border-border/40 pt-3 text-sm">
        <Row label="Server">
          {serverName ? (
            <Link
              to={`/instances/${current.instance_id}`}
              className="inline-flex items-center gap-1 text-fg transition-colors duration-200 hover:text-primary"
            >
              {serverName}
              <ChevronRight className="h-3 w-3" aria-hidden />
            </Link>
          ) : (
            "—"
          )}
        </Row>
        <Row label="Repository">
          <span className="font-mono text-[0.8125rem] break-all">
            {current.git_repo}
          </span>
        </Row>
        {current.port ? <Row label="Port">{current.port}</Row> : null}
        <Row label="Updated">
          <span title={formatDate(current.updated_at)}>
            {formatRelative(current.updated_at)}
          </span>
        </Row>
      </dl>

      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border/40 pt-3">
        <Button variant="outline" size="sm" onClick={onOpen}>
          Details
        </Button>
        <Button
          variant="secondary"
          size="sm"
          leftIcon={RefreshCw}
          onClick={onRedeploy}
          isLoading={busy}
          disabled={removing}
        >
          Redeploy
        </Button>
        <Button
          variant="ghost"
          size="sm"
          leftIcon={Trash2}
          onClick={onRemove}
          disabled={removing}
          className="ml-auto text-danger-fg hover:bg-danger-soft"
        >
          Remove
        </Button>
      </div>

      {previous.length > 0 ? (
        <details className="mt-3 border-t border-border/40 pt-3">
          <summary className="flex cursor-pointer list-none items-center gap-1.5 text-xs text-fg-muted transition-colors duration-200 hover:text-fg">
            <History className="h-3.5 w-3.5" aria-hidden />
            {previous.length} earlier run{previous.length === 1 ? "" : "s"}
          </summary>
          <ul className="mt-2 space-y-1.5">
            {previous.map((run) => (
              <li
                key={run.id}
                className="flex items-center justify-between gap-3 text-xs"
              >
                <span className="truncate text-fg-muted">
                  {formatRelative(run.created_at)}
                </span>
                <StatusPill
                  status={statusTone[run.status] ?? run.status}
                  size="sm"
                />
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </Card>
  )
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="shrink-0 text-xs text-fg-subtle">{label}</dt>
      <dd className="min-w-0 truncate text-right text-fg">{children}</dd>
    </div>
  )
}

/**
 * The create form.
 *
 * The body is camelCase because that is what the endpoint reads. The port
 * field only exists for the two frameworks that are served by a process on
 * the host; for the others the platform serves the built files itself and a
 * port would be meaningless.
 */
function DeploymentCreateDrawer({
  open,
  onClose,
  servers,
}: {
  open: boolean
  onClose: () => void
  servers: Instance[]
}) {
  const create = useCreateDeployment()

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<DeploymentForm>({
    resolver: zodResolver(deploymentSchema),
    defaultValues: {
      instanceId: "",
      domain: "",
      gitRepo: "",
      framework: "react",
      branch: "main",
      port: "",
    },
  })

  const framework = useWatch({ control, name: "framework" })
  const showPort = NEEDS_PORT.includes(framework)

  const submit = handleSubmit((values) => {
    const body: CreateDeploymentInput = {
      instanceId: values.instanceId,
      domain: values.domain,
      gitRepo: values.gitRepo,
      framework: values.framework,
      branch: values.branch,
    }
    if (NEEDS_PORT.includes(values.framework)) {
      body.port = Number(values.port)
    }

    // The hook reports both outcomes itself — a toast here would double up
    // with it. `mutate` rather than `mutateAsync` so a failure does not
    // leave an unhandled rejection behind.
    create.mutate(body, {
      onSuccess: () => {
        reset({
          instanceId: "",
          domain: "",
          gitRepo: "",
          framework: "react",
          branch: "main",
          port: "",
        })
        onClose()
      },
    })
  })

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="New deployment"
      description="Build a repository and serve it on a domain. The build runs on the server in the background."
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={create.isPending}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="deployment-create-form"
            leftIcon={Rocket}
            isLoading={create.isPending}
          >
            Start deployment
          </Button>
        </>
      }
    >
      <form id="deployment-create-form" onSubmit={submit} className="space-y-4">
        <Field
          label="Server"
          htmlFor="deployment-instance"
          required
          error={errors.instanceId?.message}
          hint="Deployments run on servers."
        >
          <select
            id="deployment-instance"
            className="h-11 w-full rounded-md border border-border/60 bg-surface px-3.5 text-[0.9375rem] text-fg focus:border-primary/70 focus:outline-none focus:ring-2 focus:ring-primary/20"
            {...register("instanceId")}
          >
            <option value="">Select a server</option>
            {servers.map((server) => (
              <option key={server.id} value={server.id}>
                {server.name}
                {server.host ? ` (${server.host})` : ""}
              </option>
            ))}
          </select>
        </Field>

        <Field
          label="Domain"
          htmlFor="deployment-domain"
          required
          error={errors.domain?.message}
          hint="The hostname the application will answer on."
        >
          <Input
            id="deployment-domain"
            placeholder="app.example.com"
            autoComplete="off"
            spellCheck={false}
            {...register("domain")}
          />
        </Field>

        <Field
          label="Repository"
          htmlFor="deployment-repo"
          required
          error={errors.gitRepo?.message}
          hint="A git URL the server can clone."
        >
          <Input
            id="deployment-repo"
            placeholder="https://github.com/you/app.git"
            autoComplete="off"
            spellCheck={false}
            className="font-mono"
            {...register("gitRepo")}
          />
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field
            label="Framework"
            htmlFor="deployment-framework"
            required
            error={errors.framework?.message}
          >
            <select
              id="deployment-framework"
              className="h-11 w-full rounded-md border border-border/60 bg-surface px-3.5 text-[0.9375rem] text-fg focus:border-primary/70 focus:outline-none focus:ring-2 focus:ring-primary/20"
              {...register("framework")}
            >
              {FRAMEWORK_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>

          <Field
            label="Branch"
            htmlFor="deployment-branch"
            required
            error={errors.branch?.message}
          >
            <Input
              id="deployment-branch"
              placeholder="main"
              autoComplete="off"
              spellCheck={false}
              className="font-mono"
              {...register("branch")}
            />
          </Field>
        </div>

        {showPort ? (
          <Field
            label="Port"
            htmlFor="deployment-port"
            required
            error={errors.port?.message}
            hint="The port the application listens on. The proxy is pointed at it."
          >
            <Input
              id="deployment-port"
              type="number"
              min={1}
              max={65535}
              placeholder="3000"
              inputMode="numeric"
              {...register("port")}
            />
          </Field>
        ) : null}
      </form>
    </Drawer>
  )
}

/**
 * One deployment in full.
 *
 * The drawer re-reads the deployment from the server rather than trusting the
 * list row it was opened from: a deployment that is running right now is a
 * different object from the one the list was showing a minute ago.
 */
function DeploymentDetailDrawer({
  id,
  serverName,
  onClose,
  onRedeploy,
  onRemove,
}: {
  id: string | null
  serverName?: string
  onClose: () => void
  onRedeploy: (deployment: Deployment) => void
  onRemove: (deployment: Deployment) => void
}) {
  const deploymentQ = useDeployment(id ?? undefined)
  const deployment = deploymentQ.data ?? null

  return (
    <Drawer
      open={id !== null}
      onClose={onClose}
      title={deployment ? deployment.domain : "Deployment"}
      description={deployment ? FRAMEWORK_LABELS[deployment.framework] ?? deployment.framework : undefined}
      footer={
        deployment ? (
          <>
            <Button
              variant="ghost"
              leftIcon={Trash2}
              onClick={() => onRemove(deployment)}
              className="mr-auto text-danger-fg hover:bg-danger-soft"
            >
              Remove
            </Button>
            <Button variant="ghost" onClick={onClose}>
              Close
            </Button>
            <Button
              variant="primary"
              leftIcon={RefreshCw}
              onClick={() => onRedeploy(deployment)}
            >
              Redeploy
            </Button>
          </>
        ) : null
      }
    >
      {deploymentQ.isLoading ? (
        <p className="text-sm text-fg-muted">Loading deployment…</p>
      ) : deploymentQ.isError ? (
        <ErrorState
          title="We couldn't load this deployment"
          error={deploymentQ.error as Error}
          onRetry={() => deploymentQ.refetch()}
          className="py-6"
        />
      ) : deployment ? (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill
              status={statusTone[deployment.status] ?? deployment.status}
              size="sm"
            />
            <Badge tone="neutral">
              {FRAMEWORK_LABELS[deployment.framework] ?? deployment.framework}
            </Badge>
            <span className="inline-flex items-center gap-1 text-xs text-fg-muted">
              <GitBranch className="h-3 w-3" aria-hidden />
              <span className="font-mono">{deployment.branch}</span>
            </span>
          </div>

          <dl className="space-y-3">
            <Detail label="Server">
              {serverName ? (
                <Link
                  to={`/instances/${deployment.instance_id}`}
                  className="inline-flex items-center gap-1 text-primary transition-colors duration-200 hover:underline"
                >
                  <Server className="h-3.5 w-3.5" aria-hidden />
                  {serverName}
                </Link>
              ) : (
                "—"
              )}
            </Detail>
            <Detail label="Repository">
              <span className="font-mono text-[0.8125rem] break-all">
                {deployment.git_repo}
              </span>
            </Detail>
            <Detail label="Application path">
              <span className="font-mono text-[0.8125rem] break-all">
                {deployment.app_path}
              </span>
            </Detail>
            {deployment.port ? (
              <Detail label="Port">{deployment.port}</Detail>
            ) : null}
            <Detail label="Created">{formatDate(deployment.created_at)}</Detail>
            <Detail label="Updated">{formatDate(deployment.updated_at)}</Detail>
            {deployment.action_id ? (
              <Detail label="Action">
                <span className="font-mono text-[0.8125rem]">
                  {deployment.action_id}
                </span>
              </Detail>
            ) : null}
          </dl>
        </div>
      ) : null}
    </Drawer>
  )
}

function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[8rem_1fr] items-baseline gap-3">
      <dt className="text-xs text-fg-subtle">{label}</dt>
      <dd className="min-w-0 break-words text-sm text-fg">{children}</dd>
    </div>
  )
}
