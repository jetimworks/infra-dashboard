import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Plus, Shield, UserPlus } from "lucide-react"
import { useAdminUsers, useCreateUser, useUpdateUser } from "../../queries/admin"
import { Card } from "../../components/ui/Card"
import { AdminTabs } from "../../components/layout/AdminTabs"
import { Button } from "../../components/ui/Button"
import { Input, Field } from "../../components/ui/Input"
import { LoadingPage } from "../../components/ui/LoadingState"
import { ErrorState } from "../../components/ui/ErrorState"
import { EmptyState } from "../../components/ui/EmptyState"
import { StatusPill } from "../../components/ui/StatusPill"
import { Drawer } from "../../components/ui/Drawer"
import { formatDate } from "../../lib/utils"
import { normalizeError } from "../../api/errors"
import type { User, UserStatus } from "../../api/types"

const createSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
  phone: z.string().min(1, "Phone number is required"),
})
type CreateForm = z.infer<typeof createSchema>

export function AdminUsersPage() {
  const usersQ = useAdminUsers()
  const [createOpen, setCreateOpen] = useState(false)
  const [editing, setEditing] = useState<User | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const create = useCreateUser()
  const update = useUpdateUser()

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

  if (usersQ.isLoading) return <LoadingPage label="Loading users…" />
  if (usersQ.isError) {
    return (
      <ErrorState
        title="We couldn't load users"
        error={usersQ.error as Error}
        onRetry={() => usersQ.refetch()}
      />
    )
  }

  const users = usersQ.data ?? []

  return (
    <div className="space-y-6">
      <AdminTabs />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-[1.75rem] font-bold leading-tight text-fg tracking-tight">
            Users
          </h1>
          <p className="mt-1 text-[0.9375rem] text-fg-muted">
            Everyone with an account on the platform.
          </p>
        </div>
        <Button
          variant="primary"
          leftIcon={UserPlus}
          onClick={() => setCreateOpen(true)}
        >
          Add user
        </Button>
      </div>

      {users.length === 0 ? (
        <Card>
          <EmptyState
            icon={Plus}
            title="No users yet"
            description="Add your first customer to get them set up."
          />
        </Card>
      ) : (
        <Card padding="sm">
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs font-medium uppercase tracking-wider text-fg-muted">
                <th className="px-3 py-3">Name</th>
                <th className="px-3 py-3">Email</th>
                <th className="px-3 py-3">Phone</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3">Role</th>
                <th className="px-3 py-3">Joined</th>
                <th className="px-3 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {users.map((u) => (
                <tr key={u.id} className="text-sm">
                  <td className="px-3 py-3 font-medium text-fg">
                    {u.first_name} {u.last_name}
                  </td>
                  <td className="px-3 py-3 text-fg-muted">{u.email}</td>
                  <td className="px-3 py-3 text-fg-muted">{u.phone ?? "—"}</td>
                  <td className="px-3 py-3">
                    <StatusPill status={u.status} size="sm" />
                  </td>
                  <td className="px-3 py-3">
                    {u.is_staff ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-accent-soft px-2 py-0.5 text-xs font-medium text-accent-soft-fg">
                        <Shield className="h-3 w-3" aria-hidden />
                        Staff
                      </span>
                    ) : (
                      <span className="text-fg-muted">Customer</span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-fg-muted">
                    {formatDate(u.created_at)}
                  </td>
                  <td className="px-3 py-3 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditing(u)}
                    >
                      Edit
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <Drawer
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Add a new user"
        description="They'll get an email with a temporary password."
      >
        <form onSubmit={handleSubmit(onCreate)} className="space-y-4">
          {errorMsg ? (
            <div
              role="alert"
              className="rounded-md border border-danger-soft bg-danger-soft p-3 text-sm text-danger-fg"
            >
              {errorMsg}
            </div>
          ) : null}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field
              label="First name"
              htmlFor="cu-first"
              required
              error={errors.first_name?.message}
            >
              <Input id="cu-first" autoComplete="off" {...register("first_name")} />
            </Field>
            <Field
              label="Last name"
              htmlFor="cu-last"
              required
              error={errors.last_name?.message}
            >
              <Input id="cu-last" autoComplete="off" {...register("last_name")} />
            </Field>
          </div>
          <Field
            label="Email"
            htmlFor="cu-email"
            required
            error={errors.email?.message}
          >
            <Input id="cu-email" type="email" {...register("email")} />
          </Field>
          <Field
            label="Phone"
            htmlFor="cu-phone"
            required
            error={errors.phone?.message}
          >
            <Input id="cu-phone" type="tel" {...register("phone")} />
          </Field>
          <div className="flex items-center justify-end gap-3 border-t border-border-subtle pt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setCreateOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={isSubmitting}
            >
              Create user
            </Button>
          </div>
        </form>
      </Drawer>

      <Drawer
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing ? `Edit ${editing.first_name} ${editing.last_name}` : "Edit user"}
        description="Change status, role, or contact info."
      >
        {editing ? (
          <EditUserForm
            user={editing}
            onClose={() => setEditing(null)}
            onSave={async (body) => {
              try {
                await update.mutateAsync({ id: editing.id, body })
                setEditing(null)
              } catch (err) {
                setErrorMsg(normalizeError(err).message)
              }
            }}
            isSaving={update.isPending}
            error={errorMsg}
          />
        ) : null}
      </Drawer>
    </div>
  )
}

function EditUserForm({
  user,
  onSave,
  onClose,
  isSaving,
  error,
}: {
  user: User
  onSave: (body: {
    status?: UserStatus
    is_staff?: boolean
    is_verified?: boolean
  }) => Promise<void>
  onClose: () => void
  isSaving: boolean
  error: string | null
}) {
  const [status, setStatus] = useState<UserStatus>(user.status)
  const [isStaff, setIsStaff] = useState(user.is_staff)
  const [isVerified, setIsVerified] = useState(user.is_verified)

  return (
    <div className="space-y-4">
      {error ? (
        <div
          role="alert"
          className="rounded-md border border-danger-soft bg-danger-soft p-3 text-sm text-danger-fg"
        >
          {error}
        </div>
      ) : null}

      <dl className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <dt className="text-xs text-fg-muted">Name</dt>
          <dd className="font-medium text-fg">
            {user.first_name} {user.last_name}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-fg-muted">Email</dt>
          <dd className="text-fg">{user.email}</dd>
        </div>
      </dl>

      <Field label="Status" htmlFor="edit-status">
        <select
          id="edit-status"
          value={status}
          onChange={(e) => setStatus(e.target.value as UserStatus)}
          className="h-11 w-full rounded-md border border-border bg-surface px-3.5 text-[0.9375rem] text-fg focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        >
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="closed">Closed</option>
        </select>
      </Field>

      <label className="flex cursor-pointer items-start gap-2.5 rounded-md border border-border bg-surface p-3">
        <input
          type="checkbox"
          checked={isStaff}
          onChange={(e) => setIsStaff(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-border text-primary focus:ring-primary"
        />
        <span>
          <span className="text-sm font-medium text-fg">Staff member</span>
          <span className="block text-xs text-fg-muted">
            Can access the admin area.
          </span>
        </span>
      </label>

      <label className="flex cursor-pointer items-start gap-2.5 rounded-md border border-border bg-surface p-3">
        <input
          type="checkbox"
          checked={isVerified}
          onChange={(e) => setIsVerified(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-border text-primary focus:ring-primary"
        />
        <span>
          <span className="text-sm font-medium text-fg">
            Email verified
          </span>
          <span className="block text-xs text-fg-muted">
            Skip the verification step for this user.
          </span>
        </span>
      </label>

      <div className="flex items-center justify-end gap-3 border-t border-border-subtle pt-4">
        <Button variant="ghost" onClick={onClose} disabled={isSaving}>
          Cancel
        </Button>
        <Button
          variant="primary"
          isLoading={isSaving}
          onClick={() =>
            onSave({ status, is_staff: isStaff, is_verified: isVerified })
          }
        >
          Save
        </Button>
      </div>
    </div>
  )
}
