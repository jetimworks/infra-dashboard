import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import {
  CheckCircle2,
  HardDriveDownload,
  MemoryStick,
  TriangleAlert,
  XCircle,
} from "lucide-react"
import { Card, CardHeader, CardTitle } from "../ui/Card"
import { Button } from "../ui/Button"
import { Field, Input } from "../ui/Input"
import { EmptyState } from "../ui/EmptyState"
import { ErrorState } from "../ui/ErrorState"
import { LoadingBlock } from "../ui/LoadingState"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/Table"
import { RingGauge } from "../ops/RingGauge"
import { memoryUsageTone } from "../ops/ring-tone"
import { WarningBlock } from "./WarningBlock"
import { useCreateSwap } from "../../queries/system"
import { normalizeError } from "../../api/errors"
import { formatBytes } from "../../lib/utils"
import {
  DEFAULT_SWAP_PATH,
  MAX_SWAP_SIZE_MB,
  MIN_SWAP_SIZE_MB,
} from "../../lib/ops-constants"
import type { SwapCreateResponse, SwapStatus } from "../../api/types"

/**
 * Swap space, and the memory it stands in for.
 *
 * The two write-ups here are deliberate:
 *
 *   - A swap file that is not in /etc/fstab is gone after the next reboot.
 *     That is a warning, not a failure, so it gets an amber callout at the
 *     top of the panel rather than a footnote at the bottom.
 *   - The backend's refusals are the diagnosis. A 409 about free space names
 *     three numbers — required, available, needed — and a paraphrase would
 *     throw away the only useful part of the message. It is rendered
 *     verbatim.
 */

const swapSchema = z.object({
  path: z
    .string()
    .trim()
    .min(1, "Enter the path for the swap file")
    .refine((value) => value.startsWith("/"), "Use an absolute path"),
  sizeMb: z
    .string()
    .trim()
    .min(1, "Enter a size in megabytes")
    .regex(/^\d+$/, "Use a whole number of megabytes")
    .refine(
      (value) => Number(value) >= MIN_SWAP_SIZE_MB,
      `The smallest swap file is ${MIN_SWAP_SIZE_MB} MB`
    )
    .refine(
      (value) => Number(value) <= MAX_SWAP_SIZE_MB,
      `The largest swap file is ${MAX_SWAP_SIZE_MB} MB`
    ),
})

type SwapForm = z.infer<typeof swapSchema>

export interface SwapPanelProps {
  instanceId: string
  status: SwapStatus | undefined
  loading: boolean
  error: { message: string } | null
  onRetry: () => void
  /** Only a VPS may have swap created on it. */
  canCreate: boolean
  /** Where this instance's swap file lives. */
  swapPath: string
  /** Called with the path the swap file was created at. */
  onSwapPathKnown: (path: string) => void
}

export function SwapPanel({
  instanceId,
  status,
  loading,
  error,
  onRetry,
  canCreate,
  swapPath,
  onSwapPathKnown,
}: SwapPanelProps) {
  const createSwap = useCreateSwap()
  const [result, setResult] = useState<SwapCreateResponse | null>(null)
  const [failure, setFailure] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SwapForm>({
    resolver: zodResolver(swapSchema),
    // `values` rather than `defaultValues`: when the swap path changes —
    // because a swap file was just created somewhere else — the field
    // follows it instead of holding on to the old path.
    values: { path: swapPath, sizeMb: "1024" },
  })

  const memory = status?.memory
  const memoryUsedPercent =
    memory && memory.total_bytes > 0
      ? (memory.used_bytes / memory.total_bytes) * 100
      : null
  const areas = status?.areas ?? []

  const submit = handleSubmit(async (values) => {
    setFailure(null)
    setResult(null)
    try {
      const response = await createSwap.mutateAsync({
        instanceId,
        sizeMb: Number(values.sizeMb),
        path: values.path,
      })
      setResult(response)
      // The new swap file lives where the operator said it does. Remember
      // that, so the fstab check and the ops score read the same path.
      onSwapPathKnown(response.path || values.path)
    } catch (err) {
      // Verbatim: the backend's 409 messages are the diagnosis.
      setFailure(normalizeError(err).message)
    }
  })

  return (
    <div className="space-y-4">
      {status?.exists && !status.in_fstab ? (
        <Card accent="warning">
          <div className="flex items-start gap-3">
            <TriangleAlert
              className="mt-0.5 h-5 w-5 shrink-0 text-warning-fg"
              aria-hidden
            />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-fg">
                Swap will not survive a restart
              </p>
              <p className="mt-1 text-sm text-fg-muted">
                The swap file at{" "}
                <code className="rounded bg-surface-sunken px-1 py-0.5 font-mono text-[0.8125rem]">
                  {status.path}
                </code>{" "}
                is not listed in <code className="font-mono">/etc/fstab</code>, so
                the host comes back without it. Adding the line makes it
                survive the next reboot.
              </p>
            </div>
          </div>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <HardDriveDownload className="h-4 w-4 text-fg-muted" aria-hidden />
            <CardTitle>Swap space</CardTitle>
          </div>
          {status?.path ? (
            <span className="font-mono text-xs text-fg-subtle">
              {status.path}
            </span>
          ) : null}
        </CardHeader>

        {error ? (
          <ErrorState
            title="Couldn't read the swap state"
            description={error.message}
            onRetry={onRetry}
            className="py-8"
          />
        ) : loading && !status ? (
          <LoadingBlock label="Reading the swap state…" className="py-8" />
        ) : !status ? (
          <EmptyState
            icon={HardDriveDownload}
            title="No swap report"
            description="The host did not report a swap state."
            className="py-8"
          />
        ) : !status.exists ? (
          <EmptyState
            icon={HardDriveDownload}
            tone="warning"
            title="This host has no swap space"
            description="Without swap, a memory spike becomes an out-of-memory kill instead of a slowdown. Add a swap file below."
            className="py-8"
          />
        ) : (
          <div className="space-y-5">
            <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
              <Stat label="Swap total" value={formatBytes(status.total_bytes)} />
              <Stat label="Swap used" value={formatBytes(status.used_bytes)} />
              <Stat
                label="Swappiness"
                value={status.swappiness ? String(status.swappiness) : "—"}
              />
              <Stat
                label="Survives reboot"
                value={status.in_fstab ? "Yes" : "No"}
                tone={status.in_fstab ? "success" : "warning"}
              />
            </dl>

            {areas.length > 0 ? (
              <div>
                <h4 className="text-sm font-semibold text-fg">Swap areas</h4>
                <Table className="mt-2 rounded-none bg-transparent shadow-none">
                  <TableHead>
                    <TableRow>
                      <TableHeader>Area</TableHeader>
                      <TableHeader className="w-28 text-right">Size</TableHeader>
                      <TableHeader className="w-28 text-right">Used</TableHeader>
                      <TableHeader className="w-20 text-right">Priority</TableHeader>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {areas.map((area) => (
                      <TableRow key={area.name}>
                        <TableCell>
                          <span className="break-all font-mono text-xs">
                            {area.name}
                          </span>
                        </TableCell>
                        <TableCell className="text-right text-xs tabular-nums">
                          {formatBytes(area.size_bytes)}
                        </TableCell>
                        <TableCell className="text-right text-xs tabular-nums">
                          {formatBytes(area.used_bytes)}
                        </TableCell>
                        <TableCell className="text-right text-xs tabular-nums text-fg-muted">
                          {area.priority}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : null}

            <WarningBlock warnings={status.warnings ?? []} />
          </div>
        )}
      </Card>

      {memory ? (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <MemoryStick className="h-4 w-4 text-fg-muted" aria-hidden />
              <CardTitle>Memory</CardTitle>
            </div>
          </CardHeader>

          <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center">
            <div className="flex shrink-0 flex-col items-center gap-2">
              <RingGauge
                value={memoryUsedPercent}
                size={120}
                tone={
                  memoryUsedPercent === null
                    ? "primary"
                    : memoryUsageTone(memoryUsedPercent)
                }
                label={
                  memoryUsedPercent === null
                    ? "Memory usage is unknown"
                    : `Memory is ${Math.round(memoryUsedPercent)} percent in use`
                }
              >
                <div className="text-center">
                  <span className="block text-[1.375rem] font-bold leading-none tabular-nums text-fg">
                    {memoryUsedPercent === null
                      ? "—"
                      : `${Math.round(memoryUsedPercent)}%`}
                  </span>
                  <span className="mt-1 block text-[0.6875rem] font-medium uppercase tracking-wider text-fg-subtle">
                    used
                  </span>
                </div>
              </RingGauge>
            </div>

            <dl className="grid min-w-0 flex-1 grid-cols-2 gap-x-6 gap-y-4">
              <Stat label="Total" value={formatBytes(memory.total_bytes)} />
              <Stat label="Used" value={formatBytes(memory.used_bytes)} />
              <Stat
                label="Available"
                value={formatBytes(memory.available_bytes)}
              />
              <Stat
                label="Swap"
                value={`${formatBytes(memory.swap_used_bytes)} of ${formatBytes(
                  memory.swap_total_bytes
                )}`}
              />
            </dl>
          </div>
        </Card>
      ) : null}

      {canCreate ? (
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Add swap space</CardTitle>
              <p className="mt-1 text-sm text-fg-muted">
                Creates a swap file on the host and activates it. The file is
                written to the path you choose and is added to{" "}
                <code className="font-mono text-[0.8125rem]">/etc/fstab</code>{" "}
                so it survives a reboot.
              </p>
            </div>
          </CardHeader>

          {result ? (
            <div
              role="status"
              aria-live="polite"
              className="mb-5 flex items-start gap-3 rounded-md bg-success-soft p-4 ring-1 ring-inset ring-success/25"
            >
              <CheckCircle2
                className="mt-0.5 h-5 w-5 shrink-0 text-success-fg"
                aria-hidden
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-success-fg">
                  Swap created at {result.path}
                </p>
                <p className="mt-1 text-sm text-fg-muted">
                  {result.size_mb} MB is now active as {formatBytes(result.total_bytes)}.
                </p>
                {result.output ? (
                  <pre className="mt-3 max-h-48 overflow-auto whitespace-pre-wrap break-words rounded-md border border-border/40 bg-surface-sunken p-3 font-mono text-[0.6875rem] leading-relaxed text-fg">
                    {result.output}
                  </pre>
                ) : null}
                <WarningBlock warnings={result.warnings ?? []} className="mt-3" />
              </div>
            </div>
          ) : null}

          {failure ? (
            <div
              role="alert"
              className="mb-5 flex items-start gap-3 rounded-md bg-danger-soft p-4 ring-1 ring-inset ring-danger/25"
            >
              <XCircle
                className="mt-0.5 h-5 w-5 shrink-0 text-danger-fg"
                aria-hidden
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-danger-fg">
                  Swap wasn't created
                </p>
                <p className="mt-1 break-words text-sm text-fg">{failure}</p>
              </div>
            </div>
          ) : null}

          <form onSubmit={submit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field
                label="Path"
                htmlFor="swap-path"
                required
                error={errors.path?.message}
                hint="Where the swap file is written on the host."
              >
                <Input
                  id="swap-path"
                  placeholder={DEFAULT_SWAP_PATH}
                  autoComplete="off"
                  spellCheck={false}
                  {...register("path")}
                />
              </Field>

              <Field
                label="Size (MB)"
                htmlFor="swap-size"
                required
                error={errors.sizeMb?.message}
                hint={`Between ${MIN_SWAP_SIZE_MB} and ${MAX_SWAP_SIZE_MB} MB.`}
              >
                <Input
                  id="swap-size"
                  type="number"
                  inputMode="numeric"
                  min={MIN_SWAP_SIZE_MB}
                  max={MAX_SWAP_SIZE_MB}
                  step={256}
                  {...register("sizeMb")}
                />
              </Field>
            </div>

            <Button
              type="submit"
              variant="primary"
              leftIcon={HardDriveDownload}
              isLoading={isSubmitting || createSwap.isPending}
              disabled={isSubmitting || createSwap.isPending}
            >
              Create swap
            </Button>
          </form>
        </Card>
      ) : null}
    </div>
  )
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone?: "success" | "warning"
}) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wider text-fg-subtle">
        {label}
      </dt>
      <dd
        className={
          tone === "success"
            ? "mt-1 text-sm font-medium tabular-nums text-success-fg"
            : tone === "warning"
              ? "mt-1 text-sm font-medium tabular-nums text-warning-fg"
              : "mt-1 text-sm font-medium tabular-nums text-fg"
        }
      >
        {value}
      </dd>
    </div>
  )
}
