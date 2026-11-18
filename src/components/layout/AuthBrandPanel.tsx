import { type ReactNode } from "react"

export interface AuthBrandPanelProps {
  eyebrow: string
  headline: ReactNode
  body: string
  children?: ReactNode
}

/**
 * The graphite panel on the auth pages.
 *
 * It was a blue-to-teal gradient with two blurred white blobs behind it.
 * A gradient that soft is decoration; a flat graphite panel with hairline
 * tiles is a console. The copy stays — it is the best writing in the app.
 */
export function AuthBrandPanel({
  eyebrow,
  headline,
  body,
  children,
}: AuthBrandPanelProps) {
  return (
    <div className="relative hidden lg:flex lg:w-[52%] lg:flex-col lg:justify-between lg:overflow-hidden bg-appbar px-16 py-16 text-appbar-fg">
      <div className="relative">
        <p className="section-label text-appbar-muted">{eyebrow}</p>
        <h2 className="mt-3 font-display text-4xl font-semibold leading-tight">
          {headline}
        </h2>
        <p className="mt-4 max-w-md text-body leading-relaxed text-appbar-muted">
          {body}
        </p>
      </div>

      {children ? <div className="relative">{children}</div> : null}
    </div>
  )
}

AuthBrandPanel.displayName = "AuthBrandPanel"
