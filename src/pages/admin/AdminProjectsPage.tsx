import { useState } from "react"
import { Link } from "react-router-dom"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Cloud, Plus, Server } from "lucide-react"
import { useProjects, useCreateProject } from "../../queries/projects"
import { useInstances } from "../../queries/instances"
import { useAdminUsers } from "../../queries/admin"
import { Card, CardHeader, CardTitle } from "../../components/ui/Card"
import { AdminTabs } from "../../components/layout/AdminTabs"
import { Button } from "../../components/ui/Button"
import { Input, Field, Textarea } from "../../components/ui/Input"
import { LoadingPage } from "../../components/ui/LoadingState"
import { ErrorState } from "../../components/ui/ErrorState"
import { EmptyState } from "../../components/ui/EmptyState"
import { Drawer } from "../../components/ui/Drawer"
import { formatDate } from "../../lib/utils"
import { normalizeError } from "../../api/errors"

const INSTANCE_TYPES = [
  { value: "t3.micro", label: "t3.micro" },
  { value: "t3.small", label: "t3.small" },
  { value: "t3.medium", label: "t3.medium" },
  { value: "t3.large", label: "t3.large" },
  { value: "t3.xlarge", label: "t3.xlarge" },
  { value: "t3.2xlarge", label: "t3.2xlarge" },
  { value: "m5.large", label: "m5.large" },
  { value: "m5.xlarge", label: "m5.xlarge" },
  { value: "m5.2xlarge", label: "m5.2xlarge" },
  { value: "m5.4xlarge", label: "m5.4xlarge" },
  { value: "c5.large", label: "c5.large" },
  { value: "c5.xlarge", label: "c5.xlarge" },
  { value: "c5.2xlarge", label: "c5.2xlarge" },
  { value: "c5.4xlarge", label: "c5.4xlarge" },
  { value: "r5.large", label: "r5.large" },
  { value: "r5.xlarge", label: "r5.xlarge" },
  { value: "r5.2xlarge", label: "r5.2xlarge" },
  { value: "r5.4xlarge", label: "r5.4xlarge" },
]

const createSchema = z.object({
  user_id: z.string().min(1, "Pick a customer"),
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  total_allocated_ram: z.string().optional(),
  total_storage_capacity: z.string().optional(),
  server_ip_addresses: z.string().optional(),
  instance_type: z.string().min(1, "Pick an instance type"),
  cpu_details: z.string().optional(),
  database_driver: z.string().optional(),
  database_version: z.string().optional(),
  redis_memory: z.string().optional(),
  billing_info: z.string().optional(),
  additional_info: z.string().optional(),
})
type CreateForm = z.infer<typeof createSchema>

export function AdminProjectsPage() {
  const projectsQ = useProjects()
  const instancesQ = useInstances()
  const usersQ = useAdminUsers()
  const [createOpen, setCreateOpen] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const create = useCreateProject()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
  })

  const onCreate = async (data: CreateForm) => {
    setErrorMsg(null)
    try {
      await create.mutateAsync(data)
      reset()
      setCreateOpen(false)
    } catch (err) {
      setErrorMsg(normalizeError(err).message)
    }
  }

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
  const instances = instancesQ.data ?? []
  const users = usersQ.data ?? []

  return (
    <div className="space-y-6">
      <AdminTabs />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-[1.75rem] font-bold leading-tight text-fg tracking-tight">
            Projects
          </h1>
          <p className="mt-1 text-[0.9375rem] text-fg-muted">
            Every project across every customer.
          </p>
        </div>
        <Button
          variant="primary"
          leftIcon={Plus}
          onClick={() => setCreateOpen(true)}
        >
          New project
        </Button>
      </div>

      {projects.length === 0 ? (
        <Card>
          <EmptyState
            icon={Cloud}
            title="No projects yet"
            description="Create a project to start grouping servers, databases, and storage for a customer."
          />
        </Card>
      ) : (
        <Card padding="sm">
          <CardHeader className="px-3">
            <CardTitle>{projects.length} project{projects.length === 1 ? "" : "s"}</CardTitle>
          </CardHeader>
          <ul className="divide-y divide-border-subtle">
            {projects.map((p) => {
              const owner = users.find((u) => u.id === p.user_id)
              const projectInstances = instances.filter(
                (i) => i.project_id === p.id
              )
              return (
                <li key={p.id} className="px-3 py-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Link
                          to={`/projects/${p.id}`}
                          className="text-sm font-semibold text-fg hover:underline"
                        >
                          {p.name}
                        </Link>
                      </div>
                      {p.description ? (
                        <p className="mt-0.5 truncate text-xs text-fg-muted">
                          {p.description}
                        </p>
                      ) : null}
                      <p className="mt-1 text-xs text-fg-muted">
                        {owner ? `${owner.first_name} ${owner.last_name}` : "—"}
                        {" · "}
                        Created {formatDate(p.created_at)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-fg-muted">
                      <div className="inline-flex items-center gap-1.5">
                        <Server className="h-3.5 w-3.5" aria-hidden />
                        {projectInstances.length} resource
                        {projectInstances.length === 1 ? "" : "s"}
                      </div>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        </Card>
      )}

      <Drawer
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="New project"
        description="Group servers, databases, and storage for a customer."
      >
        <form onSubmit={handleSubmit(onCreate)} className="space-y-5">
          {errorMsg ? (
            <div
              role="alert"
              className="rounded-md border border-danger-soft bg-danger-soft p-3 text-sm text-danger-fg"
            >
              {errorMsg}
            </div>
          ) : null}
          <Field
            label="Customer"
            htmlFor="np-user"
            required
            error={errors.user_id?.message}
          >
            <select
              id="np-user"
              {...register("user_id")}
              className="h-11 w-full rounded-md border border-border/60 bg-surface px-3.5 text-[0.9375rem] text-fg focus:border-primary/70 focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="">Select a customer</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.first_name} {u.last_name} — {u.email}
                </option>
              ))}
            </select>
          </Field>
          <Field
            label="Project name"
            htmlFor="np-name"
            required
            error={errors.name?.message}
          >
            <Input id="np-name" {...register("name")} />
          </Field>
          <Field label="Description" htmlFor="np-desc">
            <Textarea id="np-desc" rows={2} {...register("description")} />
          </Field>
          <Section title="Hardware">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Allocated RAM" htmlFor="np-ram">
                <Input id="np-ram" placeholder="e.g. 16 GB" {...register("total_allocated_ram")} />
              </Field>
              <Field label="Storage capacity" htmlFor="np-storage">
                <Input id="np-storage" placeholder="e.g. 500 GB" {...register("total_storage_capacity")} />
              </Field>
              <Field label="Server IPs" htmlFor="np-ips">
                <Input id="np-ips" placeholder="e.g. 10.0.0.1, 10.0.0.2" {...register("server_ip_addresses")} />
              </Field>
              <Field label="Instance type" htmlFor="np-instance-type" required error={errors.instance_type?.message}>
                <div className="relative">
                  <Input
                    id="np-instance-type"
                    list="instance-type-suggestions"
                    placeholder="e.g. t3.xlarge"
                    {...register("instance_type")}
                  />
                  <datalist id="instance-type-suggestions">
                    {INSTANCE_TYPES.map((t) => (
                      <option key={t.value} value={t.value} />
                    ))}
                  </datalist>
                </div>
              </Field>
              <Field label="CPU" htmlFor="np-cpu">
                <Input id="np-cpu" placeholder="e.g. 4 vCPU" {...register("cpu_details")} />
              </Field>
            </div>
          </Section>
          <Section title="Database">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Driver" htmlFor="np-db-driver">
                <Input id="np-db-driver" placeholder="e.g. postgres" {...register("database_driver")} />
              </Field>
              <Field label="Version" htmlFor="np-db-version">
                <Input id="np-db-version" placeholder="e.g. 16" {...register("database_version")} />
              </Field>
              <Field label="Redis memory" htmlFor="np-redis">
                <Input id="np-redis" placeholder="e.g. 1 GB" {...register("redis_memory")} />
              </Field>
              <Field label="Billing" htmlFor="np-billing">
                <Input id="np-billing" {...register("billing_info")} />
              </Field>
            </div>
          </Section>
          <Field label="Additional notes" htmlFor="np-additional">
            <Textarea id="np-additional" rows={2} {...register("additional_info")} />
          </Field>
          <div className="flex items-center justify-end gap-3 border-t border-border/40 pt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setCreateOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              Create project
            </Button>
          </div>
        </form>
      </Drawer>
    </div>
  )
}

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-3 rounded-md border border-border/40 bg-surface-sunken/30 p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-fg-muted">
        {title}
      </p>
      {children}
    </div>
  )
}
