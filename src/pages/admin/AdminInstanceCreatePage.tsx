import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import {
  ArrowLeft,
  Database,
  Folder,
  Server,
  Zap,
  type LucideIcon,
} from "lucide-react"
import { Link } from "react-router-dom"
import { useProjects } from "../../queries/projects"
import {
  useCreateInstance,
  useCreateLocalService,
} from "../../queries/instances"
import { Card, CardHeader, CardTitle } from "../../components/ui/Card"
import { Button } from "../../components/ui/Button"
import { Input, Field, Textarea } from "../../components/ui/Input"
import { LoadingPage } from "../../components/ui/LoadingState"
import { ErrorState } from "../../components/ui/ErrorState"
import { normalizeError } from "../../api/errors"
import type { InstanceType } from "../../api/types"

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

const localSchema = baseSchema.extend({
  host: z.string().optional(),
})

type VpsForm = z.infer<typeof vpsSchema>
type LocalForm = z.infer<typeof localSchema>

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
  const projectsQ = useProjects()
  const createInstance = useCreateInstance()
  const createLocal = useCreateLocalService()
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [type, setType] = useState<InstanceType | "">("")

  const vpsForm = useForm<VpsForm>({
    resolver: zodResolver(vpsSchema),
  })
  const localForm = useForm<LocalForm>({
    resolver: zodResolver(localSchema),
  })

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
      const created = await createLocal.mutateAsync({
        type: data.type as Exclude<InstanceType, "VPS">,
        parentId: data.project_id,
        body: { name: data.name, host: data.host },
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
                  if (opt.value === "VPS") {
                    vpsForm.setValue("type", "VPS")
                  } else {
                    localForm.setValue("type", opt.value)
                  }
                }}
                aria-pressed={selected}
                className={
                  selected
                    ? "rounded-lg border-2 border-primary bg-primary-soft p-4 text-left transition-colors"
                    : "rounded-lg border border-border bg-surface p-4 text-left transition-colors hover:border-primary/40"
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

      {errorMsg ? (
        <div
          role="alert"
          className="rounded-md border border-danger-soft bg-danger-soft p-3 text-sm text-danger-fg"
        >
          {errorMsg}
        </div>
      ) : null}

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
                  className="h-11 w-full rounded-md border border-border bg-surface px-3.5 text-[0.9375rem] text-fg focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
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
      ) : type ? (
        <form
          onSubmit={localForm.handleSubmit(onLocalSubmit)}
          className="space-y-4"
        >
          <Card>
            <CardHeader>
              <CardTitle>2. Details</CardTitle>
            </CardHeader>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field
                label="Project"
                htmlFor="cl-project"
                required
                error={localForm.formState.errors.project_id?.message}
              >
                <select
                  id="cl-project"
                  {...localForm.register("project_id")}
                  className="h-11 w-full rounded-md border border-border bg-surface px-3.5 text-[0.9375rem] text-fg focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
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
                hint="Where this service is reachable from our network."
              >
                <Input
                  id="cl-host"
                  placeholder="e.g. db.internal"
                  {...localForm.register("host")}
                />
              </Field>
            </div>
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
              isLoading={createLocal.isPending}
            >
              Create {typeOptions.find((o) => o.value === type)?.label.toLowerCase()}
            </Button>
          </div>
        </form>
      ) : null}
    </div>
  )
}
