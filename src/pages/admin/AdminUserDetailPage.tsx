import { useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { ArrowLeft, Pencil, Trash2, Shield, CheckCircle, XCircle } from "lucide-react"
import { toast } from "sonner"
import { useAdminUsers, useUpdateUser, useDeleteUser } from "../../queries/admin"
import { useProjects } from "../../queries/projects"
import { useInstances } from "../../queries/instances"
import { Card, CardHeader, CardTitle } from "../../components/ui/Card"
import { Button } from "../../components/ui/Button"
import { LoadingPage } from "../../components/ui/LoadingState"
import { ErrorState } from "../../components/ui/ErrorState"
import { Drawer } from "../../components/ui/Drawer"
import { ConfirmDialog } from "../../components/ui/ConfirmDialog"
import { formatDate, formatRelative } from "../../lib/utils"
import type { User, UserStatus } from "../../api/types"

export function AdminUserDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const usersQ = useAdminUsers()
  const projectsQ = useProjects()
  const instancesQ = useInstances()
  const update = useUpdateUser()
  const remove = useDeleteUser()

  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  const user = usersQ.data?.find((u) => u.id === id)

  if (usersQ.isLoading) return <LoadingPage label="Loading user…" />

  if (!user) {
    return (
      <ErrorState
        title="User not found"
        description="This user may have been deleted."
      />
    )
  }

  const userProjects = (projectsQ.data ?? []).filter((p) => p.user_id === user.id)
  const userInstances = (instancesQ.data ?? []).filter((i) =>
    userProjects.some((p) => p.id === i.project_id)
  )

  return (
    <div className="space-y-6">
      <div>
        <Link
          to="/admin/users"
          className="inline-flex items-center gap-1 text-sm text-fg-muted hover:text-fg"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
          Back to users
        </Link>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-soft text-primary text-lg font-semibold">
            {user.first_name?.[0]}{user.last_name?.[0]}
          </div>
          <div>
            <h1 className="text-[1.75rem] font-bold leading-tight text-fg tracking-tight">
              {user.first_name} {user.last_name}
            </h1>
            <p className="text-[0.9375rem] text-fg-muted">{user.email}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" leftIcon={Pencil} onClick={() => setEditOpen(true)}>
            Edit user
          </Button>
          <Button variant="outline-danger" size="sm" leftIcon={Trash2} onClick={() => setDeleteOpen(true)}>
            Delete
          </Button>
        </div>
      </div>

      {/* Status badges */}
      <div className="flex flex-wrap items-center gap-3">
        <StatusBadge label={user.status} />
        {user.is_staff ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-3 py-1 text-xs font-medium text-accent-fg">
            <Shield className="h-3.5 w-3.5" aria-hidden />
            Staff
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-sunken px-3 py-1 text-xs font-medium text-fg-muted">
            Customer
          </span>
        )}
        {user.is_verified ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-success-soft px-2.5 py-1 text-xs font-medium text-success-fg">
            <CheckCircle className="h-3 w-3" aria-hidden />
            Verified
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-warning-soft px-2.5 py-1 text-xs font-medium text-warning-fg">
            <XCircle className="h-3 w-3" aria-hidden />
            Unverified
          </span>
        )}
      </div>

      {/* Details Card */}
      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <div className="grid grid-cols-2 gap-6 px-5 pb-5 text-sm">
          <DetailItem label="Email" value={user.email} />
          <DetailItem label="Phone" value={user.phone ?? "—"} />
          <DetailItem label="Joined" value={formatDate(user.created_at)} />
          <DetailItem label="Last logged in" value={user.last_logged_in ? formatRelative(user.last_logged_in) : "Never"} />
          <DetailItem label="Onboarding stage" value={user.onboarding_stage ?? "—"} />
        </div>
      </Card>

      {/* Projects */}
      <Card>
        <CardHeader>
          <CardTitle>Projects ({userProjects.length})</CardTitle>
        </CardHeader>
        {userProjects.length === 0 ? (
          <p className="px-5 pb-5 text-sm text-fg-muted">No projects.</p>
        ) : (
          <ul className="divide-y divide-border-subtle">
            {userProjects.map((p) => {
              const instCount = userInstances.filter((i) => i.project_id === p.id).length
              return (
                <li key={p.id} className="px-5 py-3">
                  <Link
                    to={`/admin/projects/${p.id}`}
                    className="flex items-center justify-between hover:text-primary transition-colors"
                  >
                    <div>
                      <p className="text-sm font-medium text-fg">{p.name}</p>
                      <p className="text-xs text-fg-muted">{instCount} instance{instCount === 1 ? "" : "s"}</p>
                    </div>
                    <span className="text-xs text-fg-muted">
                      Created {formatRelative(p.created_at)}
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </Card>

      {/* Instances */}
      <Card>
        <CardHeader>
          <CardTitle>Instances ({userInstances.length})</CardTitle>
        </CardHeader>
        {userInstances.length === 0 ? (
          <p className="px-5 pb-5 text-sm text-fg-muted">No instances.</p>
        ) : (
          <ul className="divide-y divide-border-subtle">
            {userInstances.map((inst) => (
              <li key={inst.id} className="px-5 py-3">
                <Link
                  to={`/admin/instances/${inst.id}/edit`}
                  className="flex items-center justify-between hover:text-primary transition-colors"
                >
                  <div>
                    <p className="text-sm font-medium text-fg">{inst.name}</p>
                    <p className="text-xs text-fg-muted">
                      {inst.type} · {inst.host ?? "—"}
                    </p>
                  </div>
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                    inst.is_active
                      ? "bg-success-soft text-success-fg"
                      : "bg-surface-sunken text-fg-muted"
                  }`}>
                    {inst.is_active ? "Active" : "Inactive"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* Edit Drawer */}
      <EditUserDrawer
        user={user}
        open={editOpen}
        onClose={() => setEditOpen(false)}
        onSave={async (body) => {
          await update.mutateAsync({ id: user.id, body })
          usersQ.refetch()
        }}
        isSaving={update.isPending}
      />

      {/* Delete ConfirmDialog */}
      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={async () => {
          await remove.mutateAsync(user.id)
          toast.success("User deleted")
          navigate("/admin/users", { replace: true })
        }}
        title={`Delete ${user.first_name} ${user.last_name}?`}
        description="This permanently removes the user and all their data. This can't be undone."
        confirmLabel="Yes, delete them"
        tone="danger"
        requireCheckbox
        checkboxLabel="I understand this cannot be undone"
        isLoading={remove.isPending}
      />
    </div>
  )
}

function StatusBadge({ label }: { label: string }) {
  const tone =
    label === "active" ? "success" :
    label === "inactive" ? "warning" :
    "neutral"
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
      tone === "success" ? "bg-success-soft text-success-fg" :
      tone === "warning" ? "bg-warning-soft text-warning-fg" :
      "bg-surface-sunken text-fg-muted"
    }`}>
      {label.charAt(0).toUpperCase() + label.slice(1)}
    </span>
  )
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-fg-muted">{label}</p>
      <p className="font-medium text-fg">{value}</p>
    </div>
  )
}

function EditUserDrawer({
  user,
  open,
  onClose,
  onSave,
  isSaving,
}: {
  user: User
  open: boolean
  onClose: () => void
  onSave: (body: { status?: UserStatus; is_staff?: boolean; is_verified?: boolean }) => Promise<void>
  isSaving: boolean
}) {
  const [status, setStatus] = useState<UserStatus>(user.status)
  const [isStaff, setIsStaff] = useState(user.is_staff)
  const [isVerified, setIsVerified] = useState(user.is_verified)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const handleSave = async () => {
    setErrorMsg(null)
    try {
      await onSave({ status, is_staff: isStaff, is_verified: isVerified })
      onClose()
    } catch (err: unknown) {
      setErrorMsg((err as Error).message)
    }
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={`Edit ${user.first_name} ${user.last_name}`}
      description="Change status, role, or verification."
    >
      <div className="space-y-4">
        {errorMsg ? (
          <div className="rounded-md border border-danger-soft bg-danger-soft p-3 text-sm text-danger-fg">
            {errorMsg}
          </div>
        ) : null}

        <dl className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-xs text-fg-muted">Email</dt>
            <dd className="font-medium text-fg">{user.email}</dd>
          </div>
          <div>
            <dt className="text-xs text-fg-muted">Phone</dt>
            <dd className="text-fg">{user.phone ?? "—"}</dd>
          </div>
        </dl>

        <div>
          <label htmlFor="edit-status" className="block text-sm font-medium text-fg mb-1.5">Status</label>
          <select
            id="edit-status"
            value={status}
            onChange={(e) => setStatus(e.target.value as UserStatus)}
            className="h-11 w-full rounded-md border border-border/60 bg-surface px-3.5 text-[0.9375rem] text-fg focus:border-primary/70 focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="closed">Closed</option>
          </select>
        </div>

        <label className="flex cursor-pointer items-start gap-2.5 rounded-md border border-border/50 bg-surface p-3">
          <input
            type="checkbox"
            checked={isStaff}
            onChange={(e) => setIsStaff(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-border/60 text-primary focus:ring-primary"
          />
          <span>
            <span className="text-sm font-medium text-fg">Staff member</span>
            <span className="block text-xs text-fg-muted">Can access the admin area.</span>
          </span>
        </label>

        <label className="flex cursor-pointer items-start gap-2.5 rounded-md border border-border/50 bg-surface p-3">
          <input
            type="checkbox"
            checked={isVerified}
            onChange={(e) => setIsVerified(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-border/60 text-primary focus:ring-primary"
          />
          <span>
            <span className="text-sm font-medium text-fg">Email verified</span>
            <span className="block text-xs text-fg-muted">Skip the verification step for this user.</span>
          </span>
        </label>

        <div className="flex items-center justify-end gap-3 border-t border-border/40 pt-4">
          <Button variant="ghost" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button variant="primary" isLoading={isSaving} onClick={handleSave}>
            Save
          </Button>
        </div>
      </div>
    </Drawer>
  )
}
