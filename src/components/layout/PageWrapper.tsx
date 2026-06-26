import { motion, useReducedMotion, type HTMLMotionProps } from "framer-motion"
import type { ReactNode } from "react"
import { pageVariants, reducedVariants } from "../../lib/motion"

export interface PageWrapperProps extends Omit<HTMLMotionProps<"div">, "variants" | "initial" | "animate" | "exit"> {
  children: ReactNode
}

/**
 * Wraps a route's content in a motion.div that animates in on mount and
 * animates out via AnimatePresence on unmount. Respects prefers-reduced-motion.
 *
 * Used at the route-element level in App.tsx, so each route's PageWrapper is
 * keyed by location.pathname through AnimatePresence.
 */
export function PageWrapper({ children, ...rest }: PageWrapperProps) {
  const prefersReducedMotion = useReducedMotion()
  return (
    <motion.div
      variants={prefersReducedMotion ? reducedVariants : pageVariants}
      initial="initial"
      animate="enter"
      exit="exit"
      {...rest}
    >
      {children}
    </motion.div>
  )
}

PageWrapper.displayName = "PageWrapper"
