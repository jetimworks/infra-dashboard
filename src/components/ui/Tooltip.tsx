import * as TooltipPrimitive from "@radix-ui/react-tooltip"
import { type ReactNode } from "react"
import { cn } from "../../lib/utils"

export interface TooltipProps {
  content: ReactNode
  children: ReactNode
  side?: "top" | "right" | "bottom" | "left"
  align?: "start" | "center" | "end"
  className?: string
}

/**
 * A graphite inverse tooltip. The console's plain-language help copy reads
 * best on a dark chip — it separates the explanation from the data it is
 * explaining, the way a console's inline docs do.
 */
export function Tooltip({
  content,
  children,
  side = "top",
  align = "center",
  className,
}: TooltipProps) {
  return (
    <TooltipPrimitive.Provider delayDuration={200}>
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content
            side={side}
            align={align}
            sideOffset={6}
            style={{ backgroundColor: "var(--appbar)" }}
            className={cn(
              "z-50 max-w-xs rounded-md border border-appbar-line px-3 py-2 text-caption leading-relaxed text-appbar-fg shadow-[var(--shadow-popover)] animate-fade-in",
              className
            )}
          >
            {content}
            <TooltipPrimitive.Arrow style={{ fill: "var(--appbar)" }} />
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  )
}

Tooltip.displayName = "Tooltip"
