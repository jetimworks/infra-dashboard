import { useState } from "react"
import { Link } from "react-router-dom"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Cloud, Plus, Server, Pencil, Trash2 } from "lucide-react"
import { useCreateProject, useUpdateProject, useDeleteProject } from "../../queries/projects"
import { useInstances } from "../../queries/instances"
import { useAdminUsers, useAdminProjects } from "../../queries/admin"
import { Card, CardHeader, CardTitle } from "../../components/ui/Card"
import { Button } from "../../components/ui/Button"
import { Input, Field, Textarea } from "../../components/ui/Input"
import { LoadingPage } from "../../components/ui/LoadingState"
import { ErrorState } from "../../components/ui/ErrorState"
import { EmptyState } from "../../components/ui/EmptyState"
import { Drawer } from "../../components/ui/Drawer"
import { ConfirmDialog } from "../../components/ui/ConfirmDialog"
import { formatDate } from "../../lib/utils"
import { normalizeError } from "../../api/errors"
import type { Project } from "../../api/types"

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

const editSchema = createSchema.omit({ user_id: true })
type EditForm = z.infer<typeof editSchema>

export function AdminProjectsPage() {
  const projectsQ = useAdminProjects()
  const instancesQ = useInstances()
  const usersQ = useAdminUsers()
  const create = useCreateProject()
  const update = useUpdateProject()
  const remove = useDeleteProject()

  const [createOpen, setCreateOpen] = useState(false)
  const [editing, setEditing] = useState<Project | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null)
  const [createError, setCreateError] = useState<string | null>(null)
  const [editError, setEditError] = useState<string | null>(null)

  const createForm = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
  })

  const editForm = useForm<EditForm>({
    resolver: zodResolver(editSchema),
  })

  const onCreate = async (data: CreateForm) => {
    setCreateError(null)
    try {
      await create.mutateAsync(data)
      createForm.reset()
      setCreateOpen(false)
    } catch (err) {
      setCreateError(normalizeError(err).message)
    }
  }

  const onEdit = async (data: EditForm) => {
    if (!editing) return
    setEditError(null)
    try {
      await update.mutateAsync({ id: editing.id, body: data })
      setEditing(null)
    } catch (err) {
      setEditError(normalizeError(err).message)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await remove.mutateAsync(deleteTarget.id)
      setDeleteTarget(null)
    } catch {
      // Error handled by mutation
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
                          to={`/admin/projects/${p.id}`}
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
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          leftIcon={Pencil}
                          onClick={() => {
                            setEditing(p)
                            editForm.reset({
                              name: p.name,
                              description: p.description ?? "",
                              total_allocated_ram: p.total_allocated_ram,
                              total_storage_capacity: p.total_storage_capacity,
                              server_ip_addresses: p.server_ip_addresses,
                              instance_type: p.instance_type,
                              cpu_details: p.cpu_details,
                              database_driver: p.database_driver,
                              database_version: p.database_version,
                              redis_memory: p.redis_memory,
                              billing_info: p.billing_info,
                              additional_info: p.additional_info,
                            })
                          }}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="outline-danger"
                          size="sm"
                          leftIcon={Trash2}
                          onClick={() => setDeleteTarget(p)}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        </Card>
      )}

      {/* Create Drawer */}
      <Drawer
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="New project"
        description="Group servers, databases, and storage for a customer."
      >
        <form onSubmit={createForm.handleSubmit(onCreate)} className="space-y-5">
          {createError ? (
            <div
              role="alert"
              className="rounded-md border border-danger-soft bg-danger-soft p-3 text-sm text-danger-fg"
            >
              {createError}
            </div>
          ) : null}
          <Field
            label="Customer"
            htmlFor="np-user"
            required
            error={createForm.formState.errors.user_id?.message}
          >
            <select
              id="np-user"
              {...createForm.register("user_id")}
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
            error={createForm.formState.errors.name?.message}
          >
            <Input id="np-name" {...createForm.register("name")} />
          </Field>
          <Field label="Description" htmlFor="np-desc">
            <Textarea id="np-desc" rows={2} {...createForm.register("description")} />
          </Field>
          <Section title="Hardware">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Allocated RAM" htmlFor="np-ram">
                <Input id="np-ram" placeholder="e.g. 16 GB" {...createForm.register("total_allocated_ram")} />
              </Field>
              <Field label="Storage capacity" htmlFor="np-storage">
                <Input id="np-storage" placeholder="e.g. 500 GB" {...createForm.register("total_storage_capacity")} />
              </Field>
              <Field label="Server IPs" htmlFor="np-ips">
                <Input id="np-ips" placeholder="e.g. 10.0.0.1, 10.0.0.2" {...createForm.register("server_ip_addresses")} />
              </Field>
              <Field label="Instance type" htmlFor="np-instance-type" required error={createForm.formState.errors.instance_type?.message}>
                <div className="relative">
                  <Input
                    id="np-instance-type"
                    list="instance-type-suggestions"
                    placeholder="e.g. t3.xlarge"
                    {...createForm.register("instance_type")}
                  />
                  <datalist id="instance-type-suggestions">
                    {INSTANCE_TYPES.map((t) => (
                      <option key={t.value} value={t.value} />
                    ))}
                  </datalist>
                </div>
              </Field>
              <Field label="CPU" htmlFor="np-cpu">
                <Input id="np-cpu" placeholder="e.g. 4 vCPU" {...createForm.register("cpu_details")} />
              </Field>
            </div>
          </Section>
          <Section title="Database">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Driver" htmlFor="np-db-driver">
                <Input id="np-db-driver" placeholder="e.g. postgres" {...createForm.register("database_driver")} />
              </Field>
              <Field label="Version" htmlFor="np-db-version">
                <Input id="np-db-version" placeholder="e.g. 16" {...createForm.register("database_version")} />
              </Field>
              <Field label="Redis memory" htmlFor="np-redis">
                <Input id="np-redis" placeholder="e.g. 1 GB" {...createForm.register("redis_memory")} />
              </Field>
              <Field label="Billing" htmlFor="np-billing">
                <Input id="np-billing" {...createForm.register("billing_info")} />
              </Field>
            </div>
          </Section>
          <Field label="Additional notes" htmlFor="np-additional">
            <Textarea id="np-additional" rows={2} {...createForm.register("additional_info")} />
          </Field>
          <div className="flex items-center justify-end gap-3 border-t border-border/40 pt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setCreateOpen(false)}
              disabled={createForm.formState.isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={createForm.formState.isSubmitting}>
              Create project
            </Button>
          </div>
        </form>
      </Drawer>

      {/* Edit Drawer */}
      <Drawer
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing ? `Edit ${editing.name}` : "Edit project"}
        description="Update project details."
      >
        {editing ? (
          <form onSubmit={editForm.handleSubmit(onEdit)} className="space-y-5">
            {editError ? (
              <div
                role="alert"
                className="rounded-md border border-danger-soft bg-danger-soft p-3 text-sm text-danger-fg"
              >
                {editError}
              </div>
            ) : null}
            <Field
              label="Project name"
              htmlFor="ep-name"
              required
              error={editForm.formState.errors.name?.message}
            >
              <Input id="ep-name" {...editForm.register("name")} />
            </Field>
            <Field label="Description" htmlFor="ep-desc">
              <Textarea id="ep-desc" rows={2} {...editForm.register("description")} />
            </Field>
            <Section title="Hardware">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Allocated RAM" htmlFor="ep-ram">
                  <Input id="ep-ram" placeholder="e.g. 16 GB" {...editForm.register("total_allocated_ram")} />
                </Field>
                <Field label="Storage capacity" htmlFor="ep-storage">
                  <Input id="ep-storage" placeholder="e.g. 500 GB" {...editForm.register("total_storage_capacity")} />
                </Field>
                <Field label="Server IPs" htmlFor="ep-ips">
                  <Input id="ep-ips" placeholder="e.g. 10.0.0.1, 10.0.0.2" {...editForm.register("server_ip_addresses")} />
                </Field>
                <Field label="Instance type" htmlFor="ep-instance-type" error={editForm.formState.errors.instance_type?.message}>
                  <Input id="ep-instance-type" list="ep-instance-type-suggestions" placeholder="e.g. t3.xlarge" {...editForm.register("instance_type")} />
                  <datalist id="ep-instance-type-suggestions">
                    {INSTANCE_TYPES.map((t) => (
                      <option key={t.value} value={t.value} />
                    ))}
                  </datalist>
                </Field>
                <Field label="CPU" htmlFor="ep-cpu">
                  <Input id="ep-cpu" placeholder="e.g. 4 vCPU" {...editForm.register("cpu_details")} />
                </Field>
              </div>
            </Section>
            <Section title="Database">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Driver" htmlFor="ep-db-driver">
                  <Input id="ep-db-driver" placeholder="e.g. postgres" {...editForm.register("database_driver")} />
                </Field>
                <Field label="Version" htmlFor="ep-db-version">
                  <Input id="ep-db-version" placeholder="e.g. 16" {...editForm.register("database_version")} />
                </Field>
                <Field label="Redis memory" htmlFor="ep-redis">
                  <Input id="ep-redis" placeholder="e.g. 1 GB" {...editForm.register("redis_memory")} />
                </Field>
                <Field label="Billing" htmlFor="ep-billing">
                  <Input id="ep-billing" {...editForm.register("billing_info")} />
                </Field>
              </div>
            </Section>
            <Field label="Additional notes" htmlFor="ep-additional">
              <Textarea id="ep-additional" rows={2} {...editForm.register("additional_info")} />
            </Field>
            <div className="flex items-center justify-end gap-3 border-t border-border/40 pt-4">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setEditing(null)}
                disabled={editForm.formState.isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary" isLoading={editForm.formState.isSubmitting}>
                Save changes
              </Button>
            </div>
          </form>
        ) : null}
      </Drawer>

      {/* Delete ConfirmDialog */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title={deleteTarget ? `Delete ${deleteTarget.name}?` : "Delete project?"}
        description="This permanently deletes the project and all its instances. This can't be undone."
        confirmLabel="Yes, delete it"
        tone="danger"
        requireCheckbox
        checkboxLabel="I understand this cannot be undone"
        isLoading={remove.isPending}
      />
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
