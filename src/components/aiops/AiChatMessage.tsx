import { useState } from "react"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { Bot, ChevronDown, FileText, Info } from "lucide-react"
import { cn } from "../../lib/utils"
import { DURATION, EASE_OUT_QUART } from "../../lib/motion"
import type { AiContextBlock } from "../../api/types"

/**
 * One answer from the ops console.
 *
 * The console returns three different kinds of material and they are kept
 * apart on purpose:
 *
 *   - **The reply** is the answer. It is plain text, not markup, so it is
 *     rendered as paragraphs with the line breaks the model wrote preserved.
 *   - **The notes** say what the console had to do to get the answer — a
 *     second round trip, a context read that failed, a proposal that was
 *     refused. They are the caveat on the answer, so they sit directly under
 *     it rather than in a log nobody opens.
 *   - **The context blocks** are the read-only material the answer was based
 *     on. They are long and rarely needed, so they stay folded away until
 *     the operator asks for them.
 */

export interface AiChatMessageProps {
  /** The answer itself, in plain text. */
  reply: string
  /** What the console had to do to get the answer. */
  notes: string[] | null
  /** The read-only material the answer was based on. */
  context: AiContextBlock[] | null
  /** How many times the model was asked. */
  modelCalls?: number
  className?: string
}

/**
 * Split a plain-text answer into paragraphs.
 *
 * A blank line ends a paragraph. Everything else — single newlines, list
 * markers, indentation — is left exactly as the model wrote it, because
 * reformatting somebody else's explanation tends to change what it says.
 */
function paragraphs(text: string): string[] {
  return text
    .split(/\n{2,}/)
    .map((chunk) => chunk.trim())
    .filter((chunk) => chunk.length > 0)
}

export function AiChatMessage({
  reply,
  notes,
  context,
  modelCalls,
  className,
}: AiChatMessageProps) {
  const reduceMotion = useReducedMotion()
  const [contextOpen, setContextOpen] = useState(false)

  const blocks = paragraphs(reply)
  const noteList = notes ?? []
  const contextBlocks = context ?? []

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center gap-2">
        <span
          className="flex h-7 w-7 items-center justify-center rounded-full bg-accent-soft text-accent-soft-fg"
          aria-hidden
        >
          <Bot className="h-3.5 w-3.5" />
        </span>
        <span className="text-sm font-semibold text-fg">Copilot</span>
        {modelCalls && modelCalls > 0 ? (
          <span className="text-xs text-fg-subtle">
            {modelCalls === 1
              ? "one model call"
              : `${modelCalls} model calls`}
          </span>
        ) : null}
      </div>

      {blocks.length > 0 ? (
        <div className="space-y-3 border-l-2 border-border/60 pl-4">
          {blocks.map((block, index) => (
            <p
              key={index}
              className="whitespace-pre-wrap text-[0.9375rem] leading-relaxed text-fg"
            >
              {block}
            </p>
          ))}
        </div>
      ) : (
        <p className="border-l-2 border-border/60 pl-4 text-[0.9375rem] text-fg-muted">
          The console answered without any text.
        </p>
      )}

      {noteList.length > 0 ? (
        <div className="rounded-md bg-info-soft p-3 ring-1 ring-inset ring-info/25">
          <div className="flex items-start gap-2.5">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-info-fg" aria-hidden />
            <div className="min-w-0">
              <p className="text-xs font-semibold text-info-fg">
                Notes from the console
              </p>
              <ul className="mt-1 space-y-1 text-sm text-fg">
                {noteList.map((note, index) => (
                  <li key={index} className="break-words">
                    {note}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      ) : null}

      {contextBlocks.length > 0 ? (
        <div className="rounded-md border border-border/40 bg-surface-sunken/40">
          <button
            type="button"
            onClick={() => setContextOpen((open) => !open)}
            aria-expanded={contextOpen}
            aria-controls="ai-context-blocks"
            className="flex w-full items-center justify-between gap-3 px-3.5 py-2.5 text-left text-sm font-medium text-fg transition-colors duration-200 hover:text-primary"
          >
            <span className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-fg-subtle" aria-hidden />
              Context read ({contextBlocks.length})
            </span>
            <ChevronDown
              className={cn(
                "h-4 w-4 shrink-0 text-fg-subtle transition-transform duration-200",
                contextOpen ? "rotate-180" : undefined
              )}
              aria-hidden
            />
          </button>

          <AnimatePresence initial={false}>
            {contextOpen ? (
              <motion.div
                id="ai-context-blocks"
                key="context"
                initial={reduceMotion ? { opacity: 0 } : { opacity: 0, height: 0 }}
                animate={
                  reduceMotion ? { opacity: 1 } : { opacity: 1, height: "auto" }
                }
                exit={reduceMotion ? { opacity: 0 } : { opacity: 0, height: 0 }}
                transition={{
                  duration: reduceMotion ? DURATION.instant : DURATION.fast,
                  ease: EASE_OUT_QUART,
                }}
                className="overflow-hidden"
              >
                <div className="space-y-3 border-t border-border/40 px-3.5 py-3">
                  {contextBlocks.map((block, index) => (
                    <div key={index}>
                      <p className="text-xs font-semibold uppercase tracking-wide text-fg-subtle">
                        {block.title || block.type}
                      </p>
                      <pre className="mt-1.5 max-h-64 overflow-auto whitespace-pre-wrap break-words rounded-md border border-border/40 bg-surface p-3 font-mono text-[0.6875rem] leading-relaxed text-fg">
                        {block.body}
                      </pre>
                    </div>
                  ))}
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      ) : null}
    </div>
  )
}

AiChatMessage.displayName = "AiChatMessage"
