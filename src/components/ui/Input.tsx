import {
  forwardRef,
  useEffect,
  useRef,
  useState,
  type InputHTMLAttributes,
  type ReactNode,
} from "react"
import type { LucideIcon } from "lucide-react"
import { cn } from "../../lib/utils"

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: string
  hint?: string
  leftIcon?: LucideIcon
  rightIcon?: LucideIcon
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    { className, error, hint, leftIcon: LeftIcon, rightIcon: RightIcon, ...props },
    ref
  ) => {
    const [shouldShake, setShouldShake] = useState(false)
    const prevError = useRef<string | undefined>(error)

    useEffect(() => {
      // Trigger the shake animation only when error *appears*, not on every
      // render that has an error prop.
      if (error && error !== prevError.current) {
        setShouldShake(true)
        const t = window.setTimeout(() => setShouldShake(false), 340)
        return () => window.clearTimeout(t)
      }
      prevError.current = error
    }, [error])

    return (
      <div className="w-full">
        <div className="relative">
          {LeftIcon ? (
            <LeftIcon
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-subtle"
              aria-hidden
            />
          ) : null}
          <input
            ref={ref}
            className={cn(
              "flex h-11 w-full rounded-md border bg-surface px-3.5 text-[0.9375rem] text-fg",
              "placeholder:text-fg-subtle/50",
              "transition-[border-color,box-shadow] duration-200",
              "focus:outline-none focus:ring-4",
              "disabled:bg-surface-sunken disabled:opacity-70 disabled:cursor-not-allowed",
              LeftIcon && "pl-10",
              RightIcon && "pr-10",
              error
                ? "border-danger/60 focus:border-danger focus:ring-danger/15"
                : "border-border/60 focus:border-primary/70 focus:ring-primary/15",
              shouldShake && "animate-shake",
              className
            )}
            aria-invalid={error ? "true" : undefined}
            aria-describedby={hint || error ? `${props.id ?? ""}-desc` : undefined}
            {...props}
          />
          {RightIcon ? (
            <RightIcon
              className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-subtle"
              aria-hidden
            />
          ) : null}
        </div>
        {(hint || error) && (
          <p
            id={`${props.id ?? ""}-desc`}
            className={cn(
              "mt-1.5 text-xs",
              error ? "text-danger-fg" : "text-fg-muted"
            )}
          >
            {error || hint}
          </p>
        )}
      </div>
    )
  }
)
Input.displayName = "Input"

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string
  hint?: string
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, hint, rows = 4, ...props }, ref) => {
    const [shouldShake, setShouldShake] = useState(false)
    const prevError = useRef<string | undefined>(error)

    useEffect(() => {
      if (error && error !== prevError.current) {
        setShouldShake(true)
        const t = window.setTimeout(() => setShouldShake(false), 340)
        return () => window.clearTimeout(t)
      }
      prevError.current = error
    }, [error])

    return (
      <div className="w-full">
        <textarea
          ref={ref}
          rows={rows}
          className={cn(
            "flex w-full min-h-24 rounded-md border bg-surface px-3.5 py-2.5 text-[0.9375rem] text-fg",
            "placeholder:text-fg-subtle/50",
            "transition-[border-color,box-shadow] duration-200",
            "focus:outline-none focus:ring-4",
            "disabled:bg-surface-sunken disabled:opacity-70 disabled:cursor-not-allowed",
            error
              ? "border-danger/60 focus:border-danger focus:ring-danger/15"
              : "border-border/60 focus:border-primary/70 focus:ring-primary/15",
            shouldShake && "animate-shake",
            className
          )}
          aria-invalid={error ? "true" : undefined}
          {...props}
        />
        {(hint || error) && (
          <p
            className={cn(
              "mt-1.5 text-xs",
              error ? "text-danger-fg" : "text-fg-muted"
            )}
          >
            {error || hint}
          </p>
        )}
      </div>
    )
  }
)
Textarea.displayName = "Textarea"

export interface FieldProps {
  label: string
  htmlFor: string
  hint?: ReactNode
  error?: string
  required?: boolean
  children: ReactNode
}

export const Field = ({
  label,
  htmlFor,
  hint,
  error,
  required,
  children,
}: FieldProps) => {
  return (
    <div className="w-full space-y-1.5">
      <label
        htmlFor={htmlFor}
        className="flex items-center gap-1.5 text-[0.8125rem] font-medium text-fg-muted"
      >
        <span>{label}</span>
        {required ? <span className="text-danger">*</span> : null}
      </label>
      {children}
      {error ? (
        <p className="text-xs text-danger-fg">{error}</p>
      ) : hint ? (
        <p className="text-xs text-fg-muted">{hint}</p>
      ) : null}
    </div>
  )
}
Field.displayName = "Field"
