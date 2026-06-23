import { Link, useNavigate } from "react-router-dom"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Lock, ArrowRight, ShieldCheck, KeyRound } from "lucide-react"
import { useAuth } from "../auth/useAuth"
import { Button } from "../components/ui/Button"
import { Input } from "../components/ui/Input"
import { Field } from "../components/ui/Input"
import { Card } from "../components/ui/Card"
import { normalizeError } from "../api/errors"
import { toast } from "../components/ui/Toast"

const changePasswordSchema = z
  .object({
    current_password: z.string().min(1, "Enter your current password"),
    new_password: z
      .string()
      .min(8, "Use at least 8 characters — long ones are safer"),
    confirm_new_password: z.string().min(1, "Please confirm your new password"),
  })
  .refine((data) => data.new_password === data.confirm_new_password, {
    message: "The two passwords don't match",
    path: ["confirm_new_password"],
  })

type ChangePasswordForm = z.infer<typeof changePasswordSchema>

export function ChangePasswordPage() {
  const { user, changePassword, refreshUser, logout } = useAuth()
  const navigate = useNavigate()
  const [submitError, setSubmitError] = useState<string | null>(null)
  const isOnboarding = user?.onboarding_stage === "CHANGE_PASSWORD"

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<ChangePasswordForm>({
    resolver: zodResolver(changePasswordSchema),
  })

  const onSubmit = async (data: ChangePasswordForm) => {
    setSubmitError(null)
    try {
      await changePassword({
        current_password: data.current_password,
        new_password: data.new_password,
      })
      toast.success("Password updated successfully", { duration: 5000 })
      // Re-fetch user to update onboarding_stage
      await refreshUser()
      reset()
      navigate("/dashboard", { replace: true })
    } catch (err) {
      const error = normalizeError(err)
      toast.error(error.message, { duration: 5000 })
      setSubmitError(error.message)
    }
  }

  return (
    <div className="mx-auto max-w-md py-4">
      <div className="mb-8">
        <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-lg bg-primary-soft text-primary-soft-fg">
          <KeyRound className="h-6 w-6" aria-hidden />
        </div>
        <h1 className="text-[1.75rem] font-bold leading-tight text-fg tracking-tight">
          {isOnboarding ? "Set a new password" : "Change your password"}
        </h1>
        <p className="mt-2 text-[0.9375rem] text-fg-muted">
          {isOnboarding
            ? "Welcome aboard. Pick a password you'll actually remember."
            : "Pick something strong. A long sentence works great."}
        </p>
      </div>

      {isOnboarding ? (
        <div
          role="status"
          className="mb-6 flex items-start gap-3 rounded-md border border-info-soft bg-info-soft p-3.5"
        >
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-info" aria-hidden />
          <p className="text-sm text-fg">
            Your account is set up with a temporary password. Set a new one to
            finish getting started.
          </p>
        </div>
      ) : null}

      <Card>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {submitError ? (
            <div
              role="alert"
              className="rounded-md border border-danger-soft bg-danger-soft p-3 text-sm text-danger-fg"
            >
              {submitError}
            </div>
          ) : null}

          <Field
            label="Current password"
            htmlFor="current_password"
            required
            error={errors.current_password?.message}
          >
            <Input
              id="current_password"
              type="password"
              autoComplete="current-password"
              leftIcon={Lock}
              aria-invalid={errors.current_password ? "true" : undefined}
              {...register("current_password")}
            />
          </Field>

          <Field
            label="New password"
            htmlFor="new_password"
            required
            hint="At least 8 characters"
            error={errors.new_password?.message}
          >
            <Input
              id="new_password"
              type="password"
              placeholder="At least 8 characters"
              autoComplete="new-password"
              leftIcon={Lock}
              aria-invalid={errors.new_password ? "true" : undefined}
              {...register("new_password")}
            />
          </Field>

          <Field
            label="Confirm new password"
            htmlFor="confirm_new_password"
            required
            error={errors.confirm_new_password?.message}
          >
            <Input
              id="confirm_new_password"
              type="password"
              placeholder="Type it again"
              autoComplete="new-password"
              leftIcon={Lock}
              aria-invalid={errors.confirm_new_password ? "true" : undefined}
              {...register("confirm_new_password")}
            />
          </Field>

          <div className="pt-1">
            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              isLoading={isSubmitting}
              rightIcon={ArrowRight}
            >
              {isSubmitting ? "Updating…" : "Update password"}
            </Button>
          </div>
        </form>
      </Card>

      {!isOnboarding ? (
        <div className="mt-6 flex items-center justify-between text-sm">
          <Link
            to="/account"
            className="font-medium text-primary hover:underline"
          >
            Back to account
          </Link>
          <button
            type="button"
            onClick={() => {
              logout()
              navigate("/login", { replace: true })
            }}
            className="text-fg-muted hover:text-fg"
          >
            Sign out instead
          </button>
        </div>
      ) : null}
    </div>
  )
}
