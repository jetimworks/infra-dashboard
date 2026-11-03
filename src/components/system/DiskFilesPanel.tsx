import { FileText, FolderOpen, Info } from "lucide-react"
import { Card, CardHeader, CardTitle } from "../ui/Card"
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
import { formatBytes, formatDate } from "../../lib/utils"
import type { BigFilesResponse } from "../../api/types"

/**
 * The largest files on the host.
 *
 * This list is read-only by design — the backend has no endpoint that deletes
 * a file, so there is no action column and no delete affordance anywhere in
 * this panel. The operator clears space deliberately, by hand.
 */

export interface DiskFilesPanelProps {
  response: BigFilesResponse | undefined
  loading: boolean
  error: { message: string } | null
  onRetry: () => void
}

export function DiskFilesPanel({
  response,
  loading,
  error,
  onRetry,
}: DiskFilesPanelProps) {
  const files = response?.files ?? []
  const path = response?.path ?? "/var"
  const threshold = response?.min_size_mb ?? 100

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <FolderOpen className="h-4 w-4 text-fg-muted" aria-hidden />
          <CardTitle>Large files</CardTitle>
        </div>
        {response ? (
          <span className="font-mono text-xs text-fg-subtle">{path}</span>
        ) : null}
      </CardHeader>

      {error ? (
        <ErrorState
          title="Couldn't list the large files"
          description={error.message}
          onRetry={onRetry}
          className="py-8"
        />
      ) : loading && !response ? (
        <LoadingBlock label="Scanning for large files…" className="py-8" />
      ) : files.length === 0 ? (
        <EmptyState
          icon={FileText}
          tone="success"
          title="Nothing large under this path"
          description={`No file over ${threshold} MB was found in ${path}.`}
          className="py-8"
        />
      ) : (
        <>
          <p className="mb-3 text-sm text-fg-muted">
            {files.length} {files.length === 1 ? "file" : "files"} over{" "}
            {threshold} MB in {path}.
          </p>

          <Table className="rounded-none bg-transparent shadow-none">
            <TableHead>
              <TableRow>
                <TableHeader>File</TableHeader>
                <TableHeader className="w-28 text-right">Size</TableHeader>
                <TableHeader className="w-44 text-right">Modified</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {files.map((file) => (
                <TableRow key={file.path}>
                  <TableCell>
                    <span className="break-all font-mono text-xs">
                      {file.path}
                    </span>
                  </TableCell>
                  <TableCell className="text-right text-xs tabular-nums">
                    {formatBytes(file.size_bytes)}
                  </TableCell>
                  <TableCell className="text-right text-xs text-fg-muted">
                    {formatDate(file.modified_at)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <p className="mt-4 flex items-start gap-2 text-xs text-fg-subtle">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
            <span>
              This list is read-only. Nothing on this page removes a file —
              clear space deliberately, by hand.
            </span>
          </p>
        </>
      )}
    </Card>
  )
}
