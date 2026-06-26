import { useState } from "react"
import { Link, useParams } from "react-router-dom"
import {
  ArrowLeft,
  ChevronRight,
  Database,
  Folder,
  Server,
  Zap,
  Pencil,
  Trash2,
} from "lucide-react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { useProject, useUpdateProject, useDeleteProject } from "../../queries/projects"
import { useInstances } from "../../queries/instances"
import { useAdminUsers } from "../../queries/admin"
import { Card, CardHeader, CardTitle } from "../../components/ui/Card"
import { Button } from "../../components/ui/Button"
import { Input, Field, Textarea } from "../../components/ui/Input"
import { LoadingPage } from "../../components/ui/LoadingState"
import { ErrorState } from "../../components/ui/ErrorState"
import { Drawer } from "../../components/ui/Drawer"
import { ConfirmDialog } from "../../components/ui/ConfirmDialog"
import { formatDate } from "../../lib/utils"
import { normalizeError } from "../../api/errors"
import type { InstanceType } from "../../api/types"

const typeIcon: Record<InstanceType, typeof Server> = {
  VPS: Server,
  RDS: Database,
  REDIS: Zap,
  STORAGE: Folder,
}
const typeLabel: Record<InstanceType, string> = {
  VPS: "Server",
  RDS: "Database",
  REDIS: "Cache",
  STORAGE: "Storage",
}

const editSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  total_allocated_ram: z.string().optional(),
  total_storage_capacity: z.string().optional(),
  server_ip_addresses: z.string().optional(),
  instance_type: z.string().optional(),
  cpu_details: z.string().optional(),
  database_driver: z.string().optional(),
  database_version: z.string().optional(),
  redis_memory: z.string().optional(),
  billing_info: z.string().optional(),
  additional_info: z.string().optional(),
})
type EditForm = z.infer<typeof editSchema>

export function AdminProjectDetailPage() {
  const { id } = useParams<{ id: string }>()
  const projectQ = useProject(id)
  const instancesQ = useInstances()
  const usersQ = useAdminUsers()
  const update = useUpdateProject()
  const remove = useDeleteProject()

  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<EditForm>({
    resolver: zodResolver(editSchema),
  })

  if (projectQ.isLoading) return <LoadingPage label="Loading project…" />
  if (projectQ.isError || !projectQ.data) {
    return (
      <ErrorState
        title="We couldn't load this project"
        error={projectQ.error as Error}
        onRetry={() => projectQ.refetch()}
      />
    )
  }

  const project = projectQ.data
  const owner = usersQ.data?.find((u) => u.id === project.user_id)
  const projectInstances = (instancesQ.data ?? []).filter(
    (i) => i.project_id === project.id
  )

  const onEdit = async (data: EditForm) => {
    setErrorMsg(null)
    try {
      await update.mutateAsync({ id: project.id, body: data })
      reset(data)
      setEditOpen(false)
      projectQ.refetch()
    } catch (err) {
      setErrorMsg(normalizeError(err).message)
    }
  }

  const handleDelete = async () => {
    try {
      await remove.mutateAsync(project.id)
      toast.success("Project deleted")
      // Navigate back to admin projects list
      window.location.href = "/admin/projects"
    } catch {
      // Error handled by mutation
    }
  }

  const openEdit = () => {
    reset({
      name: project.name,
      description: project.description ?? "",
      total_allocated_ram: project.total_allocated_ram,
      total_storage_capacity: project.total_storage_capacity,
      server_ip_addresses: project.server_ip_addresses,
      instance_type: project.instance_type,
      cpu_details: project.cpu_details,
      database_driver: project.database_driver,
      database_version: project.database_version,
      redis_memory: project.redis_memory,
      billing_info: project.billing_info,
      additional_info: project.additional_info,
    })
    setEditOpen(true)
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          to="/admin/projects"
          className="inline-flex items-center gap-1 text-sm text-fg-muted hover:text-fg"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
          Back to projects
        </Link>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-[1.75rem] font-bold leading-tight text-fg tracking-tight">
            {project.name}
          </h1>
          {project.description ? (
            <p className="mt-1 text-[0.9375rem] text-fg-muted">
              {project.description}
            </p>
          ) : null}
          <p className="mt-1 text-sm text-fg-muted">
            Created {formatDate(project.created_at)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" leftIcon={Pencil} onClick={openEdit}>
            Edit project
          </Button>
          <Button variant="outline-danger" size="sm" leftIcon={Trash2} onClick={() => setDeleteOpen(true)}>
            Delete
          </Button>
        </div>
      </div>

      {/* Owner */}
      {owner && (
        <Card>
          <CardHeader>
            <CardTitle>Owner</CardTitle>
          </CardHeader>
          <div className="px-5 pb-5">
            <Link
              to={`/admin/users?search=${owner.email}`}
              className="flex items-center gap-3 group"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-soft text-primary font-medium text-sm">
                {owner.first_name?.[0]}{owner.last_name?.[0]}
              </div>
              <div>
                <p className="font-medium text-fg group-hover:text-primary transition-colors">
                  {owner.first_name} {owner.last_name}
                </p>
                <p className="text-sm text-fg-muted">{owner.email}</p>
              </div>
            </Link>
          </div>
        </Card>
      )}

      {/* Details */}
      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <div className="grid grid-cols-1 gap-4 px-5 pb-5 sm:grid-cols-2 lg:grid-cols-3">
          <DetailItem label="Allocated RAM" value={project.total_allocated_ram || "—"} />
          <DetailItem label="Storage" value={project.total_storage_capacity || "—"} />
          <DetailItem label="Server IPs" value={project.server_ip_addresses || "—"} />
          <DetailItem label="Instance type" value={project.instance_type || "—"} />
          <DetailItem label="CPU" value={project.cpu_details || "—"} />
          <DetailItem label="Database driver" value={project.database_driver || "—"} />
          <DetailItem label="Database version" value={project.database_version || "—"} />
          <DetailItem label="Redis memory" value={project.redis_memory || "—"} />
          <DetailItem label="Billing" value={project.billing_info || "—"} />
        </div>
      </Card>

      {/* Instances */}
      <Card>
        <CardHeader>
          <CardTitle>Instances ({projectInstances.length})</CardTitle>
        </CardHeader>
        {projectInstances.length === 0 ? (
          <p className="px-5 pb-5 text-sm text-fg-muted">No instances in this project.</p>
        ) : (
          <ul className="divide-y divide-border-subtle">
            {projectInstances.map((instance) => {
              const Icon = typeIcon[instance.type]
              return (
                <li key={instance.id} className="px-5 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary-soft text-primary">
                      <Icon className="h-4 w-4" aria-hidden />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-fg">{instance.name}</p>
                      <p className="text-xs text-fg-muted">
                        {typeLabel[instance.type]} · {instance.host ?? "—"}
                      </p>
                    </div>
                    <Link
                      to={`/admin/instances/${instance.id}/edit`}
                      className="inline-flex h-8 items-center gap-1 rounded-md px-2 text-xs font-medium text-fg-muted hover:bg-surface-sunken hover:text-fg"
                    >
                      Edit
                      <ChevronRight className="h-3.5 w-3.5" aria-hidden />
                    </Link>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </Card>

      {/* Edit Drawer */}
      <Drawer
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title={`Edit ${project.name}`}
        description="Update project details."
      >
        <form onSubmit={handleSubmit(onEdit)} className="space-y-5">
          {errorMsg ? (
            <div
              role="alert"
              className="rounded-md border border-danger-soft bg-danger-soft p-3 text-sm text-danger-fg"
            >
              {errorMsg}
            </div>
          ) : null}
          <Field label="Project name" htmlFor="ep-name" required error={errors.name?.message}>
            <Input id="ep-name" {...register("name")} />
          </Field>
          <Field label="Description" htmlFor="ep-desc">
            <Textarea id="ep-desc" rows={2} {...register("description")} />
          </Field>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Allocated RAM" htmlFor="ep-ram">
              <Input id="ep-ram" placeholder="e.g. 16 GB" {...register("total_allocated_ram")} />
            </Field>
            <Field label="Storage capacity" htmlFor="ep-storage">
              <Input id="ep-storage" placeholder="e.g. 500 GB" {...register("total_storage_capacity")} />
            </Field>
            <Field label="Server IPs" htmlFor="ep-ips">
              <Input id="ep-ips" placeholder="e.g. 10.0.0.1" {...register("server_ip_addresses")} />
            </Field>
            <Field label="Instance type" htmlFor="ep-type">
              <Input id="ep-type" placeholder="e.g. t3.xlarge" {...register("instance_type")} />
            </Field>
            <Field label="CPU" htmlFor="ep-cpu">
              <Input id="ep-cpu" placeholder="e.g. 8 vCPU" {...register("cpu_details")} />
            </Field>
            <Field label="Billing" htmlFor="ep-billing">
              <Input id="ep-billing" {...register("billing_info")} />
            </Field>
          </div>
          <div className="flex items-center justify-end gap-3 border-t border-border/40 pt-4">
            <Button type="button" variant="ghost" onClick={() => setEditOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              Save changes
            </Button>
          </div>
        </form>
      </Drawer>

      {/* Delete ConfirmDialog */}
      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        title={`Delete ${project.name}?`}
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

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-fg-muted">{label}</p>
      <p className="text-sm font-medium text-fg">{value}</p>
    </div>
  )
}
