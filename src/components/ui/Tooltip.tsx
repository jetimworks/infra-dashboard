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
            style={{ backgroundColor: "#ffffff" }}
            className={cn(
              "z-50 max-w-xs rounded-md border border-border px-4 py-3 text-sm leading-relaxed text-fg shadow-[var(--shadow-modal)] animate-fade-in font-medium dark:border-[#334155]",
              className
            )}
          >
            {content}
            <TooltipPrimitive.Arrow style={{ fill: "#ffffff" }} />
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  )
}

Tooltip.displayName = "Tooltip"
