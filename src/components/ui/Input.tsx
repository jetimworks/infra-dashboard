import {
  forwardRef,
  useEffect,
  useRef,
  useState,
  type InputHTMLAttributes,
  type ReactNode,
} from "react"
import { Eye, EyeOff, type LucideIcon } from "lucide-react"
import { cn } from "../../lib/utils"

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: string
  hint?: string
  leftIcon?: LucideIcon
  rightIcon?: LucideIcon
  /**
   * Interactive control rendered at the right edge of the field, e.g. a
   * reveal toggle. Unlike leftIcon/rightIcon — which are decorative and
   * pointer-events-none — this one is clickable, and the field reserves
   * padding for it automatically. Keep it to one control-sized child.
   */
  endAdornment?: ReactNode
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      error,
      hint,
      leftIcon: LeftIcon,
      rightIcon: RightIcon,
      endAdornment,
      ...props
    },
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
              (RightIcon || endAdornment) && "pr-10",
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
          {endAdornment ? (
            <div className="absolute right-1.5 top-1/2 -translate-y-1/2">
              {endAdornment}
            </div>
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

export type PasswordInputProps = Omit<InputProps, "type" | "endAdornment">

/**
 * A masked field with a show/hide toggle. Use it wherever a secret is typed
 * so a mistyped character can be caught before it's submitted — a password
 * cannot be read back afterwards to verify it.
 *
 * The toggle is `type="button"` so it never submits a surrounding form, and
 * carries `aria-pressed` so screen readers announce the current mode.
 */
export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ ...props }, ref) => {
    const [revealed, setRevealed] = useState(false)

    return (
      <Input
        ref={ref}
        type={revealed ? "text" : "password"}
        autoComplete="new-password"
        {...props}
        endAdornment={
          <button
            type="button"
            onClick={() => setRevealed((wasRevealed) => !wasRevealed)}
            aria-label={revealed ? "Hide password" : "Show password"}
            aria-pressed={revealed}
            className={cn(
              "inline-flex h-8 w-8 items-center justify-center rounded-md",
              "text-fg-subtle transition-colors",
              "hover:bg-surface-sunken hover:text-fg",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            )}
          >
            {revealed ? (
              <EyeOff className="h-4 w-4" aria-hidden />
            ) : (
              <Eye className="h-4 w-4" aria-hidden />
            )}
          </button>
        }
      />
    )
  }
)
PasswordInput.displayName = "PasswordInput"

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
