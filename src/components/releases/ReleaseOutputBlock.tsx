import { useState } from "react"
import { Check, Copy } from "lucide-react"
import { cn } from "../../lib/utils"

/**
 * A block of raw pipeline output.
 *
 * The output is the deploy script's own stdout and stderr. It is never
 * reworded or trimmed — the line that failed is the line the operator needs
 * to see, and a summary would hide it.
 *
 * The copy button copies the text verbatim, because the fastest way to hand
 * a build failure to someone else is to paste it.
 */

export interface ReleaseOutputBlockProps {
  output?: string | null
  /** What the block is showing. */
  title?: string
  /** Shown in place of the output when there is none. */
  emptyMessage?: string
  /** The label on the copy button. */
  copyLabel?: string
  className?: string
}

export function ReleaseOutputBlock({
  output,
  title,
  emptyMessage = "(no output captured)",
  copyLabel = "Copy",
  className,
}: ReleaseOutputBlockProps) {
  const [copied, setCopied] = useState(false)
  const text = output ?? ""

  const handleCopy = async () => {
    if (!text) return
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    } catch {
      // Clipboard access can be refused (an insecure context, a denied
      // permission). Nothing is broken — the text is on screen to select.
    }
  }

  return (
    <div className={cn("space-y-2", className)}>
      {title ? (
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-fg-muted">
            {title}
          </p>
          {text ? (
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs text-fg-subtle transition-colors hover:bg-surface-sunken hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              aria-label={copied ? "Copied" : `${copyLabel} output`}
            >
              {copied ? (
                <>
                  <Check className="h-3 w-3 text-success-fg" aria-hidden />
                  <span className="text-success-fg">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3" aria-hidden />
                  <span>{copyLabel}</span>
                </>
              )}
            </button>
          ) : null}
        </div>
      ) : null}

      <pre className="max-h-96 overflow-auto whitespace-pre-wrap break-words rounded-md border border-border/40 bg-surface-sunken p-3 font-mono text-[0.6875rem] leading-relaxed text-fg">
        {text || emptyMessage}
      </pre>
    </div>
  )
}

ReleaseOutputBlock.displayName = "ReleaseOutputBlock"
