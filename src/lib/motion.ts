import type { Transition, Variants } from "framer-motion"

/**
 * Reusable motion variants and timings for the dashboard.
 *
 * Use framer-motion's `useReducedMotion()` at the call site to short-circuit
 * transforms for users with the OS-level reduce-motion preference set.
 */

export const EASE_OUT_QUART = [0.25, 1, 0.5, 1] as const
export const EASE_OUT_QUINT = [0.22, 1, 0.36, 1] as const
export const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const

export const DURATION = {
  instant: 0.09,
  fast: 0.15,
  normal: 0.22,
  slow: 0.32,
} as const

const baseTransition: Transition = {
  duration: DURATION.normal,
  ease: EASE_OUT_QUART,
}

/** Page-level entrance: opacity + small slide-up. */
export const pageVariants: Variants = {
  initial: { opacity: 0, y: 8 },
  enter: { opacity: 1, y: 0, transition: baseTransition },
  exit: { opacity: 0, y: -4, transition: { duration: DURATION.fast, ease: EASE_OUT_QUART } },
}

/** Staggered container — apply to lists / grids. */
export const staggerContainer: Variants = {
  initial: {},
  enter: {
    transition: {
      staggerChildren: 0.04,
      delayChildren: 0.05,
    },
  },
}

/** Child of a `staggerContainer`. */
export const listItem: Variants = {
  initial: { opacity: 0, y: 6 },
  enter: { opacity: 1, y: 0, transition: { duration: 0.2, ease: EASE_OUT_QUART } },
}

/** Subtle lift + shadow for interactive cards. Apply via `whileHover` / `transition` props. */
export const cardHoverTransition: Transition = {
  duration: 0.18,
  ease: EASE_OUT_QUART,
}

/** Press feedback for buttons / clickable surfaces. */
export const pressTransition: Transition = {
  duration: DURATION.instant,
  ease: EASE_OUT_QUART,
}

/** Drawer / panel entrance. */
export const drawerVariants: Variants = {
  initial: { x: "100%" },
  enter: { x: 0, transition: { duration: 0.24, ease: EASE_OUT_QUART } },
  exit: { x: "100%", transition: { duration: 0.18, ease: EASE_OUT_QUART } },
}

/** Backdrop fade for modals / drawers. */
export const backdropVariants: Variants = {
  initial: { opacity: 0 },
  enter: { opacity: 1, transition: { duration: 0.18 } },
  exit: { opacity: 0, transition: { duration: 0.12 } },
}

/** Modal scale-in. */
export const modalVariants: Variants = {
  initial: { opacity: 0, scale: 0.96, y: 8 },
  enter: { opacity: 1, scale: 1, y: 0, transition: baseTransition },
  exit: { opacity: 0, scale: 0.97, y: 4, transition: { duration: DURATION.fast, ease: EASE_OUT_QUART } },
}

/**
 * Reduced-motion variants: opacity only, no transforms.
 * Use this if `useReducedMotion()` is true.
 */
export const reducedVariants: Variants = {
  initial: { opacity: 0 },
  enter: { opacity: 1, transition: { duration: 0.15 } },
  exit: { opacity: 0, transition: { duration: 0.1 } },
}
