import { useState } from "react"
import { Link, useParams } from "react-router-dom"
import { ArrowLeft, Check, Copy, Key, Upload } from "lucide-react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import {
  useInstance,
  useDownloadSshKey,
  useUploadSshKey,
} from "../../queries/instances"
import { Card, CardHeader, CardTitle } from "../../components/ui/Card"
import { Button } from "../../components/ui/Button"
import { Textarea } from "../../components/ui/Input"
import { LoadingPage } from "../../components/ui/LoadingState"
import { ErrorState } from "../../components/ui/ErrorState"
import { Drawer } from "../../components/ui/Drawer"

const sshKeySchema = z.object({
  ssh_key: z
    .string()
    .min(1, "Paste an SSH public key")
    .refine(
      (v) =>
        v.startsWith("ssh-rsa ") ||
        v.startsWith("ssh-ed25519 ") ||
        v.startsWith("ecdsa-") ||
        v.startsWith("sk-"),
      "That doesn't look like a valid SSH public key. It should start with ssh-rsa, ssh-ed25519, ecdsa-, or sk-"
    ),
})
type SshKeyForm = z.infer<typeof sshKeySchema>

export function AdminInstanceSshKeyPage() {
  const { id } = useParams<{ id: string }>()
  const instanceQ = useInstance(id)
  const downloadQ = useDownloadSshKey(id)
  const upload = useUploadSshKey()
  const [copied, setCopied] = useState(false)
  const [uploadOpen, setUploadOpen] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SshKeyForm>({
    resolver: zodResolver(sshKeySchema),
  })

  // When upload finishes successfully, reset the form and close the drawer.
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
  const sshKey = downloadQ.data?.ssh_key ?? ""

  const handleCopy = async () => {
    if (!sshKey) return
    try {
      await navigator.clipboard.writeText(sshKey)
      setCopied(true)
      toast.success("Copied to clipboard")
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error("Couldn't copy. Select the text manually.")
    }
  }

  const onUpload = async (data: SshKeyForm) => {
    if (!id) return
    try {
      await upload.mutateAsync({ id, body: { ssh_key: data.ssh_key } })
      reset({ ssh_key: "" })
      setUploadOpen(false)
    } catch {
      // toast handled by query mutation
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
          SSH key
        </h1>
        <p className="mt-1 text-[0.9375rem] text-fg-muted">
          Manage the SSH public key used to access{" "}
          <span className="font-medium text-fg">{instance.name}</span>. We never
          store private keys — only the public one.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Current public key</CardTitle>
            <p className="mt-1 text-sm text-fg-muted">
              Add this to your local{" "}
              <code className="rounded bg-surface-sunken px-1 py-0.5 font-mono text-[0.8125rem]">
                ~/.ssh/authorized_keys
              </code>{" "}
              to grant access.
            </p>
          </div>
          <Button
            variant="primary"
            size="sm"
            leftIcon={Upload}
            onClick={() => setUploadOpen(true)}
            disabled={downloadQ.isError}
          >
            Replace key
          </Button>
        </CardHeader>

        {downloadQ.isLoading ? (
          <p className="rounded-md border border-border-subtle bg-surface-sunken p-4 text-sm text-fg-muted">
            Loading key…
          </p>
        ) : downloadQ.isError ? (
          <div className="rounded-md border border-warning-soft bg-warning-soft/40 p-4 text-sm text-fg">
            <p className="font-medium text-warning-fg">No key on file yet</p>
            <p className="mt-1 text-fg-muted">
              Click "Replace key" to add the first public key for this server.
            </p>
          </div>
        ) : sshKey ? (
          <div className="space-y-2">
            <div className="relative">
              <pre className="max-h-72 overflow-auto whitespace-pre-wrap break-all rounded-md border border-border-subtle bg-surface-sunken p-3 pr-16 font-mono text-xs text-fg">
                {sshKey}
              </pre>
              <button
                type="button"
                onClick={handleCopy}
                aria-label="Copy SSH key"
                className="absolute right-2 top-2 inline-flex h-8 items-center gap-1 rounded-md bg-surface px-2 text-xs font-medium text-fg-muted shadow-sm transition-colors hover:bg-surface-overlay hover:text-fg"
              >
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-success" aria-hidden />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" aria-hidden />
                    Copy
                  </>
                )}
              </button>
            </div>
            <p className="text-xs text-fg-subtle">
              Last fetched{" "}
              {downloadQ.dataUpdatedAt
                ? new Date(downloadQ.dataUpdatedAt).toLocaleString()
                : "just now"}
            </p>
          </div>
        ) : (
          <div className="rounded-md border border-dashed border-border bg-surface-sunken/50 p-4 text-sm text-fg-muted">
            <Key className="mb-2 h-5 w-5 text-fg-subtle" aria-hidden />
            This server doesn't have a public key on file yet.
          </div>
        )}
      </Card>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>How it works</CardTitle>
          </div>
        </CardHeader>
        <ul className="space-y-2 text-sm text-fg-muted">
          <li className="flex gap-2">
            <span className="font-mono text-fg-subtle">1.</span>
            <span>
              Generate a key pair locally with{" "}
              <code className="rounded bg-surface-sunken px-1 py-0.5 font-mono text-[0.8125rem]">
                ssh-keygen -t ed25519
              </code>
              .
            </span>
          </li>
          <li className="flex gap-2">
            <span className="font-mono text-fg-subtle">2.</span>
            <span>
              Copy the contents of{" "}
              <code className="rounded bg-surface-sunken px-1 py-0.5 font-mono text-[0.8125rem]">
                ~/.ssh/id_ed25519.pub
              </code>{" "}
              (not the private one).
            </span>
          </li>
          <li className="flex gap-2">
            <span className="font-mono text-fg-subtle">3.</span>
            <span>
              Paste it into the panel on the right. We replace the existing key
              and you can log in with the matching private key.
            </span>
          </li>
        </ul>
      </Card>

      <Drawer
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        title="Replace SSH public key"
        description="The previous public key will be replaced. Anyone using it will lose access."
      >
        <form onSubmit={handleSubmit(onUpload)} className="space-y-4">
          <div className="rounded-md border border-warning-soft bg-warning-soft/40 p-3 text-sm text-fg">
            <p className="font-medium text-warning-fg">Heads up</p>
            <p className="mt-1 text-fg-muted">
              Make sure your new private key is already installed locally before
              you save. Otherwise you may lock yourself out.
            </p>
          </div>
          <div className="space-y-1.5">
            <label
              htmlFor="upload-ssh-key"
              className="flex items-center gap-1.5 text-[0.8125rem] font-medium text-fg-muted"
            >
              <span>Public key</span>
              <span className="text-danger">*</span>
            </label>
            <Textarea
              id="upload-ssh-key"
              rows={8}
              placeholder="ssh-ed25519 AAAA… user@host"
              autoComplete="off"
              spellCheck={false}
              {...register("ssh_key")}
            />
            {errors.ssh_key ? (
              <p className="text-xs text-danger-fg">{errors.ssh_key.message}</p>
            ) : (
              <p className="text-xs text-fg-muted">
                Should start with ssh-rsa, ssh-ed25519, ecdsa-, or sk-.
              </p>
            )}
          </div>
          <div className="flex items-center justify-end gap-3 border-t border-border-subtle pt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setUploadOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={isSubmitting || upload.isPending}
            >
              Replace key
            </Button>
          </div>
        </form>
      </Drawer>
    </div>
  )
}