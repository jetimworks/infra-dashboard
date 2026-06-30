import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import {
  ArrowLeft,
  Database,
  Folder,
  Globe,
  Server,
  Zap,
  type LucideIcon,
} from "lucide-react"
import { Link } from "react-router-dom"
import { useAdminProjects } from "../../queries/admin"
import {
  useCreateInstance,
  useCreateLocalService,
  useCreateRemoteService,
  useInstances,
} from "../../queries/instances"
import { Card, CardHeader, CardTitle } from "../../components/ui/Card"
import { Button } from "../../components/ui/Button"
import { Input, Field, Textarea } from "../../components/ui/Input"
import { LoadingPage } from "../../components/ui/LoadingState"
import { ErrorState } from "../../components/ui/ErrorState"
import { normalizeError } from "../../api/errors"
import type { Instance, InstanceType } from "../../api/types"

function ParentServerSelect({
  value,
  onChange,
}: {
  value: string
  onChange: (id: string) => void
}) {
  const { data: vpsInstances, isLoading } = useInstances({ type: "VPS" })

  // Group VPS instances by project
  const byProject = (vpsInstances ?? []).reduce<Record<string, Instance[]>>(
    (acc, inst) => {
      const pid = inst.project_id
      if (!acc[pid]) acc[pid] = []
      acc[pid].push(inst)
      return acc
    },
    {}
  )

  if (isLoading) return <p className="text-sm text-fg-muted">Loading servers…</p>

  const projectIds = Object.keys(byProject)

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-11 w-full rounded-md border border-border/60 bg-surface px-3.5 text-[0.9375rem] text-fg focus:border-primary/70 focus:outline-none focus:ring-2 focus:ring-primary/20"
    >
      <option value="">Select a server</option>
      {projectIds.map((pid) => (
        <optgroup key={pid} label={pid}>
          {byProject[pid].map((inst) => (
            <option key={inst.id} value={inst.id}>
              {inst.name} ({inst.host})
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  )
}

const baseSchema = z.object({
  project_id: z.string().min(1, "Pick a project"),
  type: z.enum(["VPS", "RDS", "REDIS", "STORAGE"]),
  name: z.string().min(1, "Name is required"),
})

const vpsSchema = baseSchema.extend({
  host: z.string().min(1, "Host is required"),
  port: z.string().optional(),
  username: z.string().optional(),
  ssh_key: z.string().optional(),
  domain: z.string().optional(),
})

// Local: requires parent VPS, optional host, config fields
// Note: project_id is inherited from the parent VPS, not entered separately
const localSchema = z.object({
  type: z.enum(["VPS", "RDS", "REDIS", "STORAGE"]),
  name: z.string().min(1, "Name is required"),
  parent_id: z.string().min(1, "Select a parent server"),
  host: z.string().optional(),
  // Local RDS config
  db_port: z.string().optional(),
  db_name: z.string().optional(),
  db_user: z.string().optional(),
  db_password: z.string().optional(),
  // Local Redis config
  redis_port: z.string().optional(),
  redis_password: z.string().optional(),
  // Local Storage config
  storage_path: z.string().optional(),
})

// Remote: requires project, host, port; optional config fields
const remoteSchema = baseSchema.extend({
  host: z.string().min(1, "Host is required"),
  port: z.string().optional(),
  username: z.string().optional(),
  password: z.string().optional(),
  domain: z.string().optional(),
  // Remote RDS config
  db_port: z.string().optional(),
  db_name: z.string().optional(),
  db_user: z.string().optional(),
  db_password: z.string().optional(),
  // Remote Redis config
  memory_mb: z.string().optional(),
  redis_version: z.string().optional(),
  // Remote Storage config
  bucket: z.string().optional(),
  region: z.string().optional(),
  provider: z.string().optional(),
})

type VpsForm = z.infer<typeof vpsSchema>
type LocalForm = z.infer<typeof localSchema>
type RemoteForm = z.infer<typeof remoteSchema>

const typeOptions: {
  value: InstanceType
  label: string
  description: string
  icon: LucideIcon
}[] = [
  {
    value: "VPS",
    label: "Server",
    description: "A virtual private server you can SSH into.",
    icon: Server,
  },
  {
    value: "RDS",
    label: "Database",
    description: "A managed relational database.",
    icon: Database,
  },
  {
    value: "REDIS",
    label: "Cache",
    description: "A managed Redis instance.",
    icon: Zap,
  },
  {
    value: "STORAGE",
    label: "Storage",
    description: "Object storage or a file bucket.",
    icon: Folder,
  },
]

export function AdminInstanceCreatePage() {
  const navigate = useNavigate()
  const projectsQ = useAdminProjects()
  const createInstance = useCreateInstance()
  const createLocal = useCreateLocalService()
  const createRemote = useCreateRemoteService()
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [type, setType] = useState<InstanceType | "">("")
  const [deployment, setDeployment] = useState<"local" | "remote" | "">("")

  const vpsForm = useForm<VpsForm>({
    resolver: zodResolver(vpsSchema),
  })
  const localForm = useForm<LocalForm>({
    resolver: zodResolver(localSchema),
  })
  const remoteForm = useForm<RemoteForm>({
    resolver: zodResolver(remoteSchema),
  })

  const parentIdValue = useWatch({ control: localForm.control, name: "parent_id" })

  if (projectsQ.isLoading) return <LoadingPage label="Loading projects…" />
  if (projectsQ.isError) {
    return (
      <ErrorState
        title="We couldn't load projects"
        error={projectsQ.error as Error}
        onRetry={() => projectsQ.refetch()}
      />
    )
  }

  const projects = projectsQ.data ?? []

  const onVpsSubmit = async (data: VpsForm) => {
    setErrorMsg(null)
    const trimmedPort = data.port?.trim() ?? ""
    const portNum = trimmedPort ? Number(trimmedPort) : undefined
    try {
      const created = await createInstance.mutateAsync({
        project_id: data.project_id,
        type: "VPS",
        name: data.name,
        host: data.host,
        port: portNum != null && !Number.isNaN(portNum) ? portNum : undefined,
        username: data.username || undefined,
        ssh_key: data.ssh_key || undefined,
        domain: data.domain || undefined,
      })
      navigate(`/admin/instances/${created.id}/edit`)
    } catch (err) {
      setErrorMsg(normalizeError(err).message)
    }
  }

  const onLocalSubmit = async (data: LocalForm) => {
    setErrorMsg(null)
    try {
      const config: Record<string, unknown> = {}
      if (data.type === "RDS") {
        if (data.db_port) config.db_port = Number(data.db_port)
        if (data.db_name) config.db_name = data.db_name
        if (data.db_user) config.db_user = data.db_user
        if (data.db_password) config.db_password = data.db_password
      }
      if (data.type === "REDIS") {
        if (data.redis_port) config.redis_port = Number(data.redis_port)
        if (data.redis_password) config.redis_password = data.redis_password
      }
      if (data.type === "STORAGE") {
        if (data.storage_path) config.storage_path = data.storage_path
      }
      const created = await createLocal.mutateAsync({
        type: data.type as Exclude<InstanceType, "VPS">,
        parentId: data.parent_id,
        body: { name: data.name, host: data.host, config, is_local: true },
      })
      navigate(`/admin/instances/${created.id}/edit`)
    } catch (err) {
      setErrorMsg(normalizeError(err).message)
    }
  }

  const onRemoteSubmit = async (data: RemoteForm) => {
    setErrorMsg(null)
    const trimmedPort = data.port?.trim() ?? ""
    const portNum = trimmedPort ? Number(trimmedPort) : undefined
    try {
      const config: Record<string, unknown> = {}
      if (data.type === "RDS") {
        if (data.db_port) config.db_port = Number(data.db_port)
        if (data.db_name) config.db_name = data.db_name
        if (data.db_user) config.db_user = data.db_user
        if (data.db_password) config.db_password = data.db_password
      }
      if (data.type === "REDIS") {
        if (data.memory_mb) config.memory_mb = Number(data.memory_mb)
        if (data.redis_version) config.version = data.redis_version
      }
      if (data.type === "STORAGE") {
        if (data.bucket) config.bucket = data.bucket
        if (data.region) config.region = data.region
        if (data.provider) config.provider = data.provider
      }
      const created = await createRemote.mutateAsync({
        type: data.type as Exclude<InstanceType, "VPS">,
        body: {
          project_id: data.project_id,
          name: data.name,
          host: data.host,
          port: portNum,
          username: data.username || undefined,
          password: data.password || undefined,
          domain: data.domain || undefined,
          config,
          is_active: true,
          is_local: false,
        },
      })
      navigate(`/admin/instances/${created.id}/edit`)
    } catch (err) {
      setErrorMsg(normalizeError(err).message)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          to="/admin/instances"
          className="inline-flex items-center gap-1 text-sm text-fg-muted hover:text-fg"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
          Back to instances
        </Link>
      </div>

      <div>
        <h1 className="text-[1.75rem] font-bold leading-tight text-fg tracking-tight">
          Add a new instance
        </h1>
        <p className="mt-1 text-[0.9375rem] text-fg-muted">
          Pick a type first, then fill in the details. You can edit anything
          later.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>1. Pick a type</CardTitle>
        </CardHeader>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {typeOptions.map((opt) => {
            const Icon = opt.icon
            const selected = type === opt.value
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  setType(opt.value)
                  setDeployment("")
                  if (opt.value === "VPS") {
                    vpsForm.setValue("type", "VPS")
                  } else {
                    localForm.setValue("type", opt.value)
                    remoteForm.setValue("type", opt.value)
                  }
                }}
                aria-pressed={selected}
                className={
                  selected
                    ? "rounded-lg border-2 border-primary bg-primary-soft p-4 text-left transition-colors"
                    : "rounded-lg border border-border/50 bg-surface p-4 text-left transition-colors hover:border-primary/40"
                }
              >
                <Icon
                  className={
                    selected
                      ? "h-6 w-6 text-primary"
                      : "h-6 w-6 text-fg-muted"
                  }
                  aria-hidden
                />
                <p className="mt-3 text-sm font-semibold text-fg">
                  {opt.label}
                </p>
                <p className="mt-1 text-xs text-fg-muted">
                  {opt.description}
                </p>
              </button>
            )
          })}
        </div>
      </Card>

      {/* Step 2: Local vs Remote — only for non-VPS types */}
      {type && type !== "VPS" ? (
        <Card>
          <CardHeader>
            <CardTitle>2. Where is this service hosted?</CardTitle>
          </CardHeader>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setDeployment("local")}
              aria-pressed={deployment === "local"}
              className={
                deployment === "local"
                  ? "rounded-lg border-2 border-primary bg-primary-soft p-4 text-left transition-colors"
                  : "rounded-lg border border-border/50 bg-surface p-4 text-left transition-colors hover:border-primary/40"
              }
            >
              <Server
                className={
                  deployment === "local"
                    ? "h-6 w-6 text-primary"
                    : "h-6 w-6 text-fg-muted"
                }
                aria-hidden
              />
              <p className="mt-3 text-sm font-semibold text-fg">Local</p>
              <p className="mt-1 text-xs text-fg-muted">
                Provision on an existing server you manage.
              </p>
            </button>
            <button
              type="button"
              onClick={() => setDeployment("remote")}
              aria-pressed={deployment === "remote"}
              className={
                deployment === "remote"
                  ? "rounded-lg border-2 border-primary bg-primary-soft p-4 text-left transition-colors"
                  : "rounded-lg border border-border/50 bg-surface p-4 text-left transition-colors hover:border-primary/40"
              }
            >
              <Globe
                className={
                  deployment === "remote"
                    ? "h-6 w-6 text-primary"
                    : "h-6 w-6 text-fg-muted"
                }
                aria-hidden
              />
              <p className="mt-3 text-sm font-semibold text-fg">Remote</p>
              <p className="mt-1 text-xs text-fg-muted">
                A standalone managed service with its own host.
              </p>
            </button>
          </div>
        </Card>
      ) : null}

      {errorMsg ? (
        <div
          role="alert"
          className="rounded-md border border-danger-soft bg-danger-soft p-3 text-sm text-danger-fg"
        >
          {errorMsg}
        </div>
      ) : null}

      {/* VPS Form */}
      {type === "VPS" ? (
        <form onSubmit={vpsForm.handleSubmit(onVpsSubmit)} className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>2. Connection details</CardTitle>
            </CardHeader>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field
                label="Project"
                htmlFor="ci-project"
                required
                error={vpsForm.formState.errors.project_id?.message}
              >
                <select
                  id="ci-project"
                  {...vpsForm.register("project_id")}
                  className="h-11 w-full rounded-md border border-border/60 bg-surface px-3.5 text-[0.9375rem] text-fg focus:border-primary/70 focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="">Select a project</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field
                label="Name"
                htmlFor="ci-name"
                required
                error={vpsForm.formState.errors.name?.message}
              >
                <Input
                  id="ci-name"
                  placeholder="e.g. web-1"
                  {...vpsForm.register("name")}
                />
              </Field>
              <Field
                label="Host"
                htmlFor="ci-host"
                required
                error={vpsForm.formState.errors.host?.message}
              >
                <Input
                  id="ci-host"
                  placeholder="e.g. 10.0.0.5"
                  {...vpsForm.register("host")}
                />
              </Field>
              <Field label="Port" htmlFor="ci-port">
                <Input
                  id="ci-port"
                  type="number"
                  placeholder="22"
                  {...vpsForm.register("port")}
                />
              </Field>
              <Field label="Username" htmlFor="ci-user">
                <Input
                  id="ci-user"
                  placeholder="root"
                  {...vpsForm.register("username")}
                />
              </Field>
              <Field label="Domain" htmlFor="ci-domain">
                <Input
                  id="ci-domain"
                  placeholder="example.com"
                  {...vpsForm.register("domain")}
                />
              </Field>
            </div>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>3. SSH key (optional)</CardTitle>
            </CardHeader>
            <Field
              label="Public key"
              htmlFor="ci-ssh"
              hint="Paste an SSH public key for passwordless login."
            >
              <Textarea
                id="ci-ssh"
                rows={4}
                placeholder="ssh-rsa AAAA..."
                {...vpsForm.register("ssh_key")}
              />
            </Field>
          </Card>
          <div className="flex items-center justify-end gap-3">
            <Link
              to="/admin/instances"
              className="inline-flex h-10 items-center justify-center rounded-md px-4 text-[0.9375rem] font-medium text-fg-muted hover:bg-surface-sunken hover:text-fg"
            >
              Cancel
            </Link>
            <Button
              type="submit"
              variant="primary"
              isLoading={createInstance.isPending}
            >
              Create server
            </Button>
          </div>
        </form>
      ) : null}

      {/* Local service form */}
      {type && type !== "VPS" && deployment === "local" ? (
        <form onSubmit={localForm.handleSubmit(onLocalSubmit)} className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>3. Service details</CardTitle>
            </CardHeader>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field
                label="Parent server"
                htmlFor="cl-parent"
                required
                error={localForm.formState.errors.parent_id?.message}
                hint="The server to provision this service on."
              >
                <ParentServerSelect
                  value={parentIdValue ?? ""}
                  onChange={(id) =>
                    localForm.setValue("parent_id", id, {
                      shouldValidate: true,
                    })
                  }
                />
              </Field>
              <Field
                label="Name"
                htmlFor="cl-name"
                required
                error={localForm.formState.errors.name?.message}
              >
                <Input
                  id="cl-name"
                  placeholder="e.g. main-db"
                  {...localForm.register("name")}
                />
              </Field>
              <Field
                label="Host (optional)"
                htmlFor="cl-host"
                hint="Internal hostname for this service."
              >
                <Input
                  id="cl-host"
                  placeholder="e.g. db.internal"
                  {...localForm.register("host")}
                />
              </Field>
            </div>
          </Card>

          {/* RDS-specific local fields */}
          {type === "RDS" ? (
            <Card>
              <CardHeader>
                <CardTitle>4. Database settings</CardTitle>
              </CardHeader>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Port" htmlFor="cl-db-port" hint="Defaults to 5432.">
                  <Input
                    id="cl-db-port"
                    type="number"
                    placeholder="5432"
                    {...localForm.register("db_port")}
                  />
                </Field>
                <Field label="Database name" htmlFor="cl-db-name">
                  <Input
                    id="cl-db-name"
                    placeholder="mydb"
                    {...localForm.register("db_name")}
                  />
                </Field>
                <Field label="Username" htmlFor="cl-db-user">
                  <Input
                    id="cl-db-user"
                    placeholder="postgres"
                    {...localForm.register("db_user")}
                  />
                </Field>
                <Field label="Password" htmlFor="cl-db-password">
                  <Input
                    id="cl-db-password"
                    type="password"
                    placeholder="••••••••"
                    {...localForm.register("db_password")}
                  />
                </Field>
              </div>
            </Card>
          ) : null}

          {/* Redis-specific local fields */}
          {type === "REDIS" ? (
            <Card>
              <CardHeader>
                <CardTitle>4. Cache settings</CardTitle>
              </CardHeader>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Port" htmlFor="cl-redis-port" hint="Defaults to 6379.">
                  <Input
                    id="cl-redis-port"
                    type="number"
                    placeholder="6379"
                    {...localForm.register("redis_port")}
                  />
                </Field>
                <Field label="Password" htmlFor="cl-redis-password">
                  <Input
                    id="cl-redis-password"
                    type="password"
                    placeholder="••••••••"
                    {...localForm.register("redis_password")}
                  />
                </Field>
              </div>
            </Card>
          ) : null}

          {/* Storage-specific local fields */}
          {type === "STORAGE" ? (
            <Card>
              <CardHeader>
                <CardTitle>4. Storage settings</CardTitle>
              </CardHeader>
              <div className="grid grid-cols-1 gap-4">
                <Field label="Mount path" htmlFor="cl-storage-path" hint="Where to mount the storage volume.">
                  <Input
                    id="cl-storage-path"
                    placeholder="/mnt/data"
                    {...localForm.register("storage_path")}
                  />
                </Field>
              </div>
            </Card>
          ) : null}

          <div className="flex items-center justify-end gap-3">
            <Link
              to="/admin/instances"
              className="inline-flex h-10 items-center justify-center rounded-md px-4 text-[0.9375rem] font-medium text-fg-muted hover:bg-surface-sunken hover:text-fg"
            >
              Cancel
            </Link>
            <Button
              type="submit"
              variant="primary"
              isLoading={createLocal.isPending}
            >
              Create {typeOptions.find((o) => o.value === type)?.label.toLowerCase()}
            </Button>
          </div>
        </form>
      ) : null}

      {/* Remote service form */}
      {type && type !== "VPS" && deployment === "remote" ? (
        <form onSubmit={remoteForm.handleSubmit(onRemoteSubmit)} className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>3. Connection details</CardTitle>
            </CardHeader>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field
                label="Project"
                htmlFor="cr-project"
                required
                error={remoteForm.formState.errors.project_id?.message}
              >
                <select
                  id="cr-project"
                  {...remoteForm.register("project_id")}
                  className="h-11 w-full rounded-md border border-border/60 bg-surface px-3.5 text-[0.9375rem] text-fg focus:border-primary/70 focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="">Select a project</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field
                label="Name"
                htmlFor="cr-name"
                required
                error={remoteForm.formState.errors.name?.message}
              >
                <Input
                  id="cr-name"
                  placeholder="e.g. main-db"
                  {...remoteForm.register("name")}
                />
              </Field>
              <Field
                label="Host"
                htmlFor="cr-host"
                required
                error={remoteForm.formState.errors.host?.message}
              >
                <Input
                  id="cr-host"
                  placeholder="e.g. db.example.com"
                  {...remoteForm.register("host")}
                />
              </Field>
              <Field label="Port" htmlFor="cr-port">
                <Input
                  id="cr-port"
                  type="number"
                  placeholder="5432"
                  {...remoteForm.register("port")}
                />
              </Field>
              <Field label="Username" htmlFor="cr-user">
                <Input
                  id="cr-user"
                  placeholder="postgres"
                  {...remoteForm.register("username")}
                />
              </Field>
              <Field label="Password" htmlFor="cr-password">
                <Input
                  id="cr-password"
                  type="password"
                  placeholder="••••••••"
                  {...remoteForm.register("password")}
                />
              </Field>
              <Field label="Domain" htmlFor="cr-domain">
                <Input
                  id="cr-domain"
                  placeholder="example.com"
                  {...remoteForm.register("domain")}
                />
              </Field>
            </div>
          </Card>

          {/* RDS-specific remote fields */}
          {type === "RDS" ? (
            <Card>
              <CardHeader>
                <CardTitle>4. Database settings</CardTitle>
              </CardHeader>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Database name" htmlFor="cr-db-name">
                  <Input
                    id="cr-db-name"
                    placeholder="mydb"
                    {...remoteForm.register("db_name")}
                  />
                </Field>
                <Field label="Database port" htmlFor="cr-db-port">
                  <Input
                    id="cr-db-port"
                    type="number"
                    placeholder="5432"
                    {...remoteForm.register("db_port")}
                  />
                </Field>
                <Field label="Username" htmlFor="cr-db-user">
                  <Input
                    id="cr-db-user"
                    placeholder="postgres"
                    {...remoteForm.register("db_user")}
                  />
                </Field>
                <Field label="Password" htmlFor="cr-db-password">
                  <Input
                    id="cr-db-password"
                    type="password"
                    placeholder="••••••••"
                    {...remoteForm.register("db_password")}
                  />
                </Field>
              </div>
            </Card>
          ) : null}

          {/* Redis-specific remote fields */}
          {type === "REDIS" ? (
            <Card>
              <CardHeader>
                <CardTitle>4. Cache settings</CardTitle>
              </CardHeader>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Memory (MB)" htmlFor="cr-memory">
                  <Input
                    id="cr-memory"
                    type="number"
                    placeholder="1024"
                    {...remoteForm.register("memory_mb")}
                  />
                </Field>
                <Field label="Version" htmlFor="cr-version">
                  <Input
                    id="cr-version"
                    placeholder="7"
                    {...remoteForm.register("redis_version")}
                  />
                </Field>
              </div>
            </Card>
          ) : null}

          {/* Storage-specific remote fields */}
          {type === "STORAGE" ? (
            <Card>
              <CardHeader>
                <CardTitle>4. Storage settings</CardTitle>
              </CardHeader>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Field label="Bucket" htmlFor="cr-bucket">
                  <Input
                    id="cr-bucket"
                    placeholder="my-bucket"
                    {...remoteForm.register("bucket")}
                  />
                </Field>
                <Field label="Region" htmlFor="cr-region">
                  <Input
                    id="cr-region"
                    placeholder="us-east-1"
                    {...remoteForm.register("region")}
                  />
                </Field>
                <Field label="Provider" htmlFor="cr-provider">
                  <Input
                    id="cr-provider"
                    placeholder="aws"
                    {...remoteForm.register("provider")}
                  />
                </Field>
              </div>
            </Card>
          ) : null}

          <div className="flex items-center justify-end gap-3">
            <Link
              to="/admin/instances"
              className="inline-flex h-10 items-center justify-center rounded-md px-4 text-[0.9375rem] font-medium text-fg-muted hover:bg-surface-sunken hover:text-fg"
            >
              Cancel
            </Link>
            <Button
              type="submit"
              variant="primary"
              isLoading={createRemote.isPending}
            >
              Create {typeOptions.find((o) => o.value === type)?.label.toLowerCase()}
            </Button>
          </div>
        </form>
      ) : null}
    </div>
  )
}
