import { useState } from "react"
import { Link, useParams } from "react-router-dom"
import { ArrowLeft, Play, Terminal } from "lucide-react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useInstance, useSystemAction } from "../../queries/instances"
import { Card, CardHeader, CardTitle } from "../../components/ui/Card"
import { Button } from "../../components/ui/Button"
import { Input, Field } from "../../components/ui/Input"
import { LoadingPage } from "../../components/ui/LoadingState"
import { ErrorState } from "../../components/ui/ErrorState"
import { normalizeError } from "../../api/errors"
import type { SystemActionResponse, SystemActionVerb } from "../../api/types"

const actionSchema = z.object({
  action: z.enum(["stop", "start", "restart", "reload"]),
  service: z
    .string()
    .min(1, "Enter a service name like nginx, postgresql, redis-server"),
})
type ActionForm = z.infer<typeof actionSchema>

const actionOptions: { value: SystemActionVerb; label: string; description: string }[] = [
  {
    value: "start",
    label: "Start",
    description: "Begin running the service. Use if it's stopped.",
  },
  {
    value: "stop",
    label: "Stop",
    description: "Halt the service. Anything depending on it will lose access.",
  },
  {
    value: "restart",
    label: "Restart",
    description: "Stop then start the service. Brief downtime, fresh state.",
  },
  {
    value: "reload",
    label: "Reload",
    description: "Re-read the configuration without dropping connections.",
  },
]

export function AdminInstanceSystemActionPage() {
  const { id } = useParams<{ id: string }>()
  const instanceQ = useInstance(id)
  const run = useSystemAction()
  const [result, setResult] = useState<SystemActionResponse | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ActionForm>({
    resolver: zodResolver(actionSchema),
    defaultValues: { action: "restart", service: "" },
  })

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

  const onSubmit = async (data: ActionForm) => {
    setErrorMsg(null)
    setResult(null)
    if (!id) return
    try {
      const res = await run.mutateAsync({ id, body: data })
      setResult(res)
    } catch (err) {
      setErrorMsg(normalizeError(err).message)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          to={`/admin/instances/${instance.id}/edit`}
          className="inline-flex items-center gap-1 text-sm text-fg-muted hover:text-fg"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
          Back to {instance.name}
        </Link>
      </div>

      <div>
        <h1 className="text-[1.75rem] font-bold leading-tight text-fg tracking-tight">
          System action
        </h1>
        <p className="mt-1 text-[0.9375rem] text-fg-muted">
          Run{" "}
          <code className="rounded bg-surface-sunken px-1 py-0.5 font-mono text-[0.8125rem]">
            systemctl &lt;action&gt; &lt;service&gt;
          </code>{" "}
          on{" "}
          <span className="font-medium text-fg">{instance.name}</span>. You'll see
          the output right here. No SSH required.
        </p>
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
            <div>
              <CardTitle>Run an action</CardTitle>
              <p className="mt-1 text-sm text-fg-muted">
                Pick what to do and which service. Both are required.
              </p>
            </div>
          </CardHeader>
          <div className="space-y-4">
            <fieldset>
              <legend className="mb-2 text-[0.8125rem] font-medium text-fg-muted">
                Action
              </legend>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {actionOptions.map((opt) => (
                  <label
                    key={opt.value}
                    className="flex cursor-pointer items-start gap-2.5 rounded-md border border-border bg-surface p-3 transition-colors hover:border-primary/40 has-[:checked]:border-primary has-[:checked]:bg-primary-soft/40"
                  >
                    <input
                      type="radio"
                      value={opt.value}
                      {...register("action")}
                      className="mt-0.5 h-4 w-4 border-border text-primary focus:ring-primary"
                    />
                    <span>
                      <span className="block text-sm font-medium text-fg">
                        {opt.label}
                      </span>
                      <span className="mt-0.5 block text-xs text-fg-muted">
                        {opt.description}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
            <Field
              label="Service"
              htmlFor="sa-service"
              required
              error={errors.service?.message}
              hint="Examples: nginx, postgresql, redis-server, ssh"
            >
              <Input
                id="sa-service"
                placeholder="e.g. nginx"
                autoComplete="off"
                spellCheck={false}
                {...register("service")}
              />
            </Field>
            <div className="flex items-center justify-end gap-3 border-t border-border-subtle pt-4">
              <Button
                type="button"
                variant="ghost"
                onClick={() => reset()}
                disabled={isSubmitting}
              >
                Reset
              </Button>
              <Button
                type="submit"
                variant="primary"
                isLoading={isSubmitting || run.isPending}
                leftIcon={Play}
              >
                Run action
              </Button>
            </div>
          </div>
        </Card>
      </form>

      {result ? (
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Output</CardTitle>
              <p className="mt-1 text-sm text-fg-muted">{result.message}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setResult(null)}
            >
              Clear
            </Button>
          </CardHeader>
          <div className="space-y-3">
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-fg-muted">
                stdout
              </p>
              <pre className="overflow-auto rounded-md border border-border-subtle bg-surface-sunken p-3 font-mono text-xs text-fg">
                {result.stdout || "(empty)"}
              </pre>
            </div>
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-fg-muted">
                stderr
              </p>
              <pre
                className={
                  result.stderr
                    ? "overflow-auto rounded-md border border-warning-soft bg-warning-soft/40 p-3 font-mono text-xs text-fg"
                    : "overflow-auto rounded-md border border-border-subtle bg-surface-sunken p-3 font-mono text-xs text-fg-muted"
                }
              >
                {result.stderr || "(empty)"}
              </pre>
            </div>
          </div>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Tips</CardTitle>
          </div>
        </CardHeader>
        <ul className="space-y-2 text-sm text-fg-muted">
          <li className="flex gap-2">
            <Terminal className="mt-0.5 h-4 w-4 shrink-0 text-fg-subtle" aria-hidden />
            <span>
              Prefer <code className="rounded bg-surface-sunken px-1 py-0.5 font-mono text-[0.8125rem]">reload</code> over{" "}
              <code className="rounded bg-surface-sunken px-1 py-0.5 font-mono text-[0.8125rem]">restart</code>{" "}
              when changing config — it keeps connections alive.
            </span>
          </li>
          <li className="flex gap-2">
            <Terminal className="mt-0.5 h-4 w-4 shrink-0 text-fg-subtle" aria-hidden />
            <span>
              Need to know which services are available? SSH in and run{" "}
              <code className="rounded bg-surface-sunken px-1 py-0.5 font-mono text-[0.8125rem]">
                systemctl list-units --type=service
              </code>
              .
            </span>
          </li>
        </ul>
      </Card>
    </div>
  )
}