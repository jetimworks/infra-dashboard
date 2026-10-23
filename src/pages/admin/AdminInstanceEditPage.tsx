import { useEffect, useMemo, useState, type FormEvent } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { ArrowLeft, Save, Trash2, Key, Terminal } from "lucide-react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import {
  useInstance,
  useUpdateInstance,
  useUpdateInstancePassword,
  useDeactivateInstance,
  useDeleteInstance,
} from "../../queries/instances"
import { Card, CardHeader, CardTitle } from "../../components/ui/Card"
import { Button } from "../../components/ui/Button"
import { Input, Field, PasswordInput } from "../../components/ui/Input"
import { LoadingPage } from "../../components/ui/LoadingState"
import { ErrorState } from "../../components/ui/ErrorState"
import { StatusPill } from "../../components/ui/StatusPill"
import { ConfirmDialog } from "../../components/ui/ConfirmDialog"
import { normalizeError } from "../../api/errors"
import type { InstanceType } from "../../api/types"
import { DEFAULT_SERVICE_NAME, isValidServiceName, SERVICE_NAME_ERROR } from "../../lib/service-name"
import {
  DB_HOST_ERROR,
  DB_IDENT_ERROR,
  DB_PORT_ERROR,
  DB_SSL_MODES,
  DEFAULT_DB_SSL_MODE,
  isValidDbHost,
  isValidDbIdent,
  isValidDbPort,
  readRemoteDbConfig,
} from "../../lib/remote-db"

/**
 * Built per instance type rather than declared once, because a REMOTE_RDS's
 * database name is required and every other type has no such field at all.
 * Making it unconditionally required would break every other edit: an
 * unregistered field is absent from the submitted values entirely, so a bare
 * z.string() would reject every non-REMOTE_RDS instance with "Required".
 */
function buildEditSchema(instanceType: InstanceType) {
  return z
    .object({
      name: z.string().min(1, "Name is required"),
      host: z.string().optional(),
      port: z.string().optional(),
      username: z.string().optional(),
      domain: z.string().optional(),
      // VPS-only repository metadata. Optional on edit so untouched rows are
      // omitted from the PUT body (the backend treats omitted keys as no-op).
      github_repo: z.string().optional(),
      github_branch: z.string().optional(),
      // Unlike its siblings above, "" is NOT a no-op here — it is the only value
      // that resets the column back to NULL. So "" has to survive validation.
      // Optional because the field only renders for VPS: an unregistered field is
      // absent from the submitted values entirely, and a bare z.string() would
      // then reject every non-VPS instance with "Required".
      service_name: z
        .string()
        .optional()
        .refine(
          (v) => v === undefined || v === "" || isValidServiceName(v),
          SERVICE_NAME_ERROR
        ),
      // REMOTE_RDS connection settings, held in config rather than columns.
      db_name: z.string().optional(),
      db_ssl_mode: z.enum(DB_SSL_MODES).optional(),
    })
    .superRefine((data, ctx) => {
      if (instanceType !== "REMOTE_RDS") return

      // Required, and unlike the user there is no sensible default:
      // connecting to "postgres" when the operator meant their application
      // database would report a healthy connection against the wrong
      // database, which is worse than refusing.
      const database = data.db_name?.trim() ?? ""
      if (!isValidDbIdent(database)) {
        ctx.addIssue({
          code: "custom",
          path: ["db_name"],
          message: database ? DB_IDENT_ERROR : "Database name is required",
        })
      }

      if (data.host !== undefined && !isValidDbHost(data.host)) {
        ctx.addIssue({
          code: "custom",
          path: ["host"],
          message: DB_HOST_ERROR,
        })
      }
      if (!isValidDbPort(data.port ?? "")) {
        ctx.addIssue({
          code: "custom",
          path: ["port"],
          message: DB_PORT_ERROR,
        })
      }
      if (data.username?.trim() && !isValidDbIdent(data.username.trim())) {
        ctx.addIssue({
          code: "custom",
          path: ["username"],
          message: DB_IDENT_ERROR,
        })
      }
    })
}

type EditForm = z.infer<ReturnType<typeof buildEditSchema>>

export function AdminInstanceEditPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const instanceQ = useInstance(id)
  const updateInstance = useUpdateInstance()
  const updatePassword = useUpdateInstancePassword()
  const deactivate = useDeactivateInstance()
  const remove = useDeleteInstance()
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  // The password control is deliberately outside the main form: it has its own
  // submit so a password can never ride along with an unrelated edit. The key
  // lets us remount PasswordInput after a save, which clears the field and
  // drops the reveal back to masked.
  const [password, setPassword] = useState("")
  const [passwordFieldKey, setPasswordFieldKey] = useState(0)
  // A REMOTE_RDS credential is a separate secret from a VPS root password, so
  // it gets its own state and its own <form> rather than sharing the pair
  // above — the two cards are mutually exclusive by type, but a shared box
  // would silently carry one instance's secret into the other's submit.
  const [dbPassword, setDbPassword] = useState("")
  const [dbPasswordFieldKey, setDbPasswordFieldKey] = useState(0)

  // Undefined until the instance loads; the resolver is only consulted on
  // submit, by which point the type is known.
  const instanceType = instanceQ.data?.type
  const resolver = useMemo(
    () => zodResolver(buildEditSchema(instanceType as InstanceType)),
    [instanceType]
  )

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<EditForm>({ resolver })

  useEffect(() => {
    if (instanceQ.data) {
      // A REMOTE_RDS row's canonical config is written by the backend as
      // exactly these four keys, so reading them back is reading the row's
      // real connection settings rather than guessing at aliases.
      const db = readRemoteDbConfig(instanceQ.data.config)
      reset({
        name: instanceQ.data.name,
        host: instanceQ.data.host ?? "",
        port: instanceQ.data.port != null ? String(instanceQ.data.port) : "",
        username: instanceQ.data.username ?? "",
        domain: instanceQ.data.domain ?? "",
        github_repo: instanceQ.data.github_repo ?? "",
        github_branch: instanceQ.data.github_branch ?? "",
        // NULL hydrates as an empty box, so "clear it" is reachable by hand.
        service_name: instanceQ.data.service_name ?? "",
        db_name: db.database,
        db_ssl_mode: db.sslMode,
      })
    }
  }, [instanceQ.data, reset])

  if (instanceQ.isLoading) return <LoadingPage label="Loading instance…" />
  if (instanceQ.isError || !instanceQ.data) {
    return (
      <ErrorState
        title="We couldn't load this instance"
        error={instanceQ.error as Error}
        onRetry={() => instanceQ.refetch()}
      />
    )
  }

  const instance = instanceQ.data

  const onSubmit = async (data: EditForm) => {
    setErrorMsg(null)
    if (!id) return
    const trimmedPort = data.port?.trim() ?? ""
    const portNum = trimmedPort ? Number(trimmedPort) : null
    try {
      await updateInstance.mutateAsync({
        id,
        body: {
          name: data.name,
          host: data.host || null,
          port: portNum != null && !Number.isNaN(portNum) ? portNum : null,
          username: data.username || null,
          domain: data.domain || null,
          github_repo: data.github_repo || null,
          github_branch: data.github_branch || null,
          // Deliberately "" and not null. Every field above sends null when
          // blank and the backend reads that as "leave alone" — for
          // service_name it's the reverse: "" is the documented signal to
          // write NULL, and null would be swallowed. Changing this line to
          // `|| null` silently breaks the reset-to-default control.
          // Omitted entirely for non-VPS, which have no unit to name.
          ...(instance.type === "VPS"
            ? { service_name: data.service_name || "" }
            : {}),
          // REMOTE_RDS keeps its database name and TLS mode in config. The
          // backend merges this onto what is stored rather than replacing it,
          // then re-canonicalises — so db_user and db_port come back from the
          // host/port/username sent alongside, and db_password is never in
          // this body at all (it goes through the credential form below).
          ...(instance.type === "REMOTE_RDS"
            ? {
                config: {
                  db_name: data.db_name?.trim(),
                  db_ssl_mode: data.db_ssl_mode ?? DEFAULT_DB_SSL_MODE,
                },
              }
            : {}),
        },
      })
      reset(data)
    } catch (err) {
      setErrorMsg(normalizeError(err).message)
    }
  }

  const handlePasswordSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!id || !password) return
    try {
      await updatePassword.mutateAsync({ id, password })
      // Never leave a plaintext secret sitting in a live input, and fall back
      // to masked so the next value isn't readable over a shoulder.
      setPassword("")
      setPasswordFieldKey((key) => key + 1)
    } catch {
      // toast handled by the mutation's onError
    }
  }

  const handleDbPasswordSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!id || !dbPassword) return
    try {
      // Same PUT, same hook, different secret. The backend's REMOTE_RDS update
      // path treats a supplied password as a replacement and re-encrypts it
      // into encrypted_password; omitting it entirely leaves the stored
      // credential untouched, which is why this is a standalone submit rather
      // than another field on the main form.
      await updatePassword.mutateAsync({ id, password: dbPassword })
      setDbPassword("")
      setDbPasswordFieldKey((key) => key + 1)
    } catch {
      // toast handled by the mutation's onError
    }
  }

  const handleDeactivateToggle = () => {
    if (!id) return
    deactivate.mutate({ id, isActive: !instance.is_active })
  }

  const handleDelete = async () => {
    if (!id) return
    try {
      await remove.mutateAsync(id)
      navigate("/admin/instances", { replace: true })
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

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-[1.5rem] font-bold leading-tight text-fg tracking-tight xs:text-[1.625rem] sm:text-[1.75rem]">
            {instance.name}
          </h1>
          <div className="mt-1 flex items-center gap-2 text-sm text-fg-muted">
            <span>{instance.type}</span>
            <StatusPill
              status={instance.is_active ? "active" : "inactive"}
              size="sm"
            />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
          {instance.type === "VPS" ? (
            <Button variant="outline" size="sm" leftIcon={Key}>
              <Link to={`/admin/instances/${instance.id}/ssh-key`}>
                SSH key
              </Link>
            </Button>
          ) : null}
          {instance.type === "VPS" ? (
            <Button variant="outline" size="sm" leftIcon={Terminal}>
              <Link to={`/admin/instances/${instance.id}/system-action`}>
                System action
              </Link>
            </Button>
          ) : null}
        </div>
      </div>

      {errorMsg ? (
        <div
          role="alert"
          className="rounded-md border border-danger-soft bg-danger-soft p-3 text-sm text-danger-fg"
        >
          {errorMsg}
        </div>
      ) : null}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field
              label="Name"
              htmlFor="ie-name"
              required
              error={errors.name?.message}
            >
              <Input id="ie-name" {...register("name")} />
            </Field>
            <Field label="Host" htmlFor="ie-host">
              <Input id="ie-host" {...register("host")} />
            </Field>
            <Field label="Port" htmlFor="ie-port">
              <Input
                id="ie-port"
                type="number"
                {...register("port")}
              />
            </Field>
            <Field label="Username" htmlFor="ie-user">
              <Input id="ie-user" {...register("username")} />
            </Field>
            <Field label="Domain" htmlFor="ie-domain">
              <Input id="ie-domain" {...register("domain")} />
            </Field>
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Repository &amp; service</CardTitle>
          </CardHeader>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field
              label="GitHub repo"
              htmlFor="ie-github-repo"
              hint="owner/repo slug, e.g. jetimworks/api"
            >
              <Input
                id="ie-github-repo"
                placeholder="jetimworks/api"
                {...register("github_repo")}
              />
            </Field>
            <Field
              label="Branch"
              htmlFor="ie-github-branch"
              hint="The branch this server tracks."
            >
              <Input
                id="ie-github-branch"
                placeholder="main"
                {...register("github_branch")}
              />
            </Field>
            {instance.type === "VPS" ? (
              <Field
                label="Service name"
                htmlFor="ie-service-name"
                error={errors.service_name?.message}
                hint={`The systemd unit app control starts, stops and restarts. Clear this to go back to the ${DEFAULT_SERVICE_NAME} default.`}
              >
                <Input
                  id="ie-service-name"
                  placeholder={DEFAULT_SERVICE_NAME}
                  autoComplete="off"
                  spellCheck={false}
                  {...register("service_name")}
                />
              </Field>
            ) : null}
          </div>
        </Card>

        {instance.type === "REMOTE_RDS" ? (
          <Card>
            <CardHeader>
              <CardTitle>Database</CardTitle>
            </CardHeader>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field
                label="Database name"
                htmlFor="ie-db-name"
                required
                error={errors.db_name?.message}
                hint="There's deliberately no default — connecting to the wrong database would report a healthy connection."
              >
                <Input
                  id="ie-db-name"
                  placeholder="mydb"
                  autoComplete="off"
                  spellCheck={false}
                  {...register("db_name")}
                />
              </Field>
              <Field
                label="TLS mode"
                htmlFor="ie-db-ssl-mode"
                hint="How the connection to this database is encrypted."
              >
                <select
                  id="ie-db-ssl-mode"
                  {...register("db_ssl_mode")}
                  className="h-11 w-full rounded-md border border-border/60 bg-surface px-3.5 text-[0.9375rem] text-fg focus:border-primary/70 focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  {DB_SSL_MODES.map((mode) => (
                    <option key={mode} value={mode}>
                      {mode}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <p className="mt-3 text-xs text-fg-muted">
              Host, port and username above are the coordinates we dial. The
              password is set separately below.
            </p>
          </Card>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle>Configuration</CardTitle>
          </CardHeader>
          <pre className="overflow-x-auto rounded-md border border-border/40 bg-surface-sunken p-3 font-mono text-xs text-fg">
            {JSON.stringify(instance.config, null, 2)}
          </pre>
        </Card>

        <div className="flex items-center justify-end gap-3 border-t border-border/40 pt-4">
          <Button
            type="submit"
            variant="primary"
            isLoading={isSubmitting || updateInstance.isPending}
            disabled={!isDirty}
            leftIcon={Save}
          >
            Save changes
          </Button>
        </div>
      </form>

      {instance.type === "REMOTE_RDS" ? (
        <Card>
          <CardHeader>
            <CardTitle>Database credential</CardTitle>
          </CardHeader>
          <form onSubmit={handleDbPasswordSubmit} className="space-y-4">
            <Field
              label="Database password"
              htmlFor="ie-db-password"
              hint="Used to connect to this database and to browse its schema. Leave blank to keep the current password — we never show it once saved."
            >
              <PasswordInput
                key={dbPasswordFieldKey}
                id="ie-db-password"
                value={dbPassword}
                onChange={(event) => setDbPassword(event.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
              />
            </Field>
            {dbPassword ? (
              <p className="rounded-md border border-warning-soft bg-warning-soft/40 p-3 text-sm text-fg">
                <span className="font-medium text-warning-fg">Heads up.</span>{" "}
                <span className="text-fg-muted">
                  This replaces the stored password immediately. If it&apos;s
                  wrong, connection tests and the schema browser will stop
                  authenticating.
                </span>
              </p>
            ) : null}
            <div className="flex items-center justify-end gap-3 border-t border-border/40 pt-4">
              <Button
                type="submit"
                variant="primary"
                isLoading={updatePassword.isPending}
                disabled={!dbPassword || updatePassword.isPending}
              >
                Update password
              </Button>
            </div>
          </form>
        </Card>
      ) : null}

      {instance.type === "VPS" ? (
        <Card>
          <CardHeader>
            <CardTitle>Access</CardTitle>
          </CardHeader>
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <Field
              label="Root password"
              htmlFor="ie-password"
              hint="Used for checks, backups, deploys and security audits. Leave blank to keep the current password — we never show it once saved."
            >
              <PasswordInput
                key={passwordFieldKey}
                id="ie-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••"
              />
            </Field>
            {password ? (
              <p className="rounded-md border border-warning-soft bg-warning-soft/40 p-3 text-sm text-fg">
                <span className="font-medium text-warning-fg">Heads up.</span>{" "}
                <span className="text-fg-muted">
                  This replaces the stored password immediately. If it&apos;s
                  wrong, checks, backups and deploys will quietly stop
                  authenticating.
                </span>
              </p>
            ) : null}
            <div className="flex items-center justify-end gap-3 border-t border-border/40 pt-4">
              <Button
                type="submit"
                variant="primary"
                isLoading={updatePassword.isPending}
                disabled={!password || updatePassword.isPending}
              >
                Update password
              </Button>
            </div>
          </form>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Danger zone</CardTitle>
        </CardHeader>
        <div className="space-y-3">
          <div className="flex items-center justify-between rounded-md border border-border/50 bg-surface p-3">
            <div>
              <p className="text-sm font-medium text-fg">
                {instance.is_active ? "Deactivate" : "Reactivate"} this instance
              </p>
              <p className="text-xs text-fg-muted">
                {instance.is_active
                  ? "Stops checks. Customers will see it as inactive."
                  : "Re-enable checks for this instance."}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDeactivateToggle}
              isLoading={deactivate.isPending}
            >
              {instance.is_active ? "Deactivate" : "Reactivate"}
            </Button>
          </div>
          <div className="flex items-center justify-between rounded-md border border-danger-soft bg-danger-soft/30 p-3">
            <div>
              <p className="text-sm font-medium text-fg">Delete this instance</p>
              <p className="text-xs text-fg-muted">
                Permanently removes the instance. This can't be undone.
              </p>
            </div>
            <Button
              variant="outline-danger"
              size="sm"
              leftIcon={Trash2}
              onClick={() => setDeleteOpen(true)}
            >
              Delete
            </Button>
          </div>
        </div>
      </Card>

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        title={`Delete ${instance.name}?`}
        description="This permanently removes the instance from the platform. Any backups and metrics history will be kept but orphaned. This can't be undone."
        confirmLabel="Yes, delete it"
        tone="danger"
        requireCheckbox
        checkboxLabel="I understand this cannot be undone"
        isLoading={remove.isPending}
      />
    </div>
  )
}
