import { useState } from "react"
import { Link } from "react-router-dom"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Cloud, Mail, ArrowRight, AlertTriangle, ArrowLeft } from "lucide-react"
import { useAuth } from "../auth/useAuth"
import { cosplayApi } from "../api/cosplay"
import { userApi } from "../api/user"
import { setAccessToken } from "../api/client"
import { normalizeError } from "../api/errors"
import { Button } from "../components/ui/Button"
import { Input } from "../components/ui/Input"
import { Field } from "../components/ui/Input"

const cosplaySchema = z.object({
  email: z.string().email("Enter a valid email address"),
})

type CosplayForm = z.infer<typeof cosplaySchema>

export function CosplayPage() {
  const { impersonate } = useAuth()
  const [cosplayError, setCosplayError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CosplayForm>({
    resolver: zodResolver(cosplaySchema),
  })

  const onSubmit = async (data: CosplayForm) => {
    setCosplayError(null)
    try {
      // Step 1: Get impersonation token from admin
      const { access_token } = await cosplayApi.impersonate(data.email)

      // Step 2: Set the token in memory so subsequent API calls use it
      setAccessToken(access_token)

      // Step 3: Fetch the impersonated user's profile
      const userData = await userApi.getProfile()

      // Step 4: Update auth state and redirect to dashboard
      impersonate(access_token, userData)
    } catch (err) {
      const apiError = normalizeError(err)
      if (apiError.status === 404) {
        setCosplayError("No user found with that email address.")
      } else if (apiError.status === 403) {
        setCosplayError("Admin access required to impersonate users.")
      } else {
        setCosplayError(apiError.message)
      }
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* Left — Form */}
      <div className="relative flex w-full flex-col justify-center bg-bg px-6 py-10 lg:w-[48%] lg:px-16 xl:px-24">
        <div className="absolute left-0 right-0 top-0 h-1 accent-bar-top lg:left-0 lg:right-auto lg:h-full lg:w-1" aria-hidden />
        <div className="mx-auto w-full max-w-md">
          <div className="mb-10 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-accent text-fg-on-accent shadow-sm shadow-accent/30">
              <Cloud className="h-5 w-5" aria-hidden />
            </div>
            <div>
              <p className="text-[1.0625rem] font-semibold text-fg">Infra</p>
              <p className="text-xs text-fg-muted">by Jetimworks</p>
            </div>
          </div>

          <div className="mb-8">
            <h1 className="text-[2rem] font-bold leading-tight text-fg tracking-tight">
              Impersonate User
            </h1>
            <p className="mt-2 text-[0.9375rem] text-fg-muted">
              Enter an email address to sign in as that user.
            </p>
          </div>

          {/* Warning banner */}
          <div
            className="mb-6 card-accent card-accent-warning flex items-start gap-3 rounded-md border border-warning-soft bg-warning-soft/60 p-4"
            role="alert"
          >
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning-fg" aria-hidden />
            <div className="text-sm text-fg">
              <p className="font-medium text-warning-fg">Temporary impersonation session</p>
              <p className="mt-0.5 text-fg-muted">
                This session will not persist on page refresh. You will need to
                re-authenticate as yourself to impersonate another user.
              </p>
            </div>
          </div>

          {cosplayError ? (
            <div
              role="alert"
              className="mb-6 rounded-md border border-danger-soft bg-danger-soft p-3 text-sm text-danger-fg"
            >
              {cosplayError}
            </div>
          ) : null}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <Field
              label="Email address"
              htmlFor="email"
              required
              error={errors.email?.message}
            >
              <Input
                id="email"
                type="email"
                placeholder="user@company.com"
                autoComplete="email"
                leftIcon={Mail}
                aria-invalid={errors.email ? "true" : undefined}
                {...register("email")}
              />
            </Field>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              isLoading={isSubmitting}
              rightIcon={isSubmitting ? undefined : ArrowRight}
            >
              {isSubmitting ? "Impersonating…" : "Impersonate User"}
            </Button>
          </form>

          <div className="mt-6 flex items-center justify-between text-sm">
            <Link
              to="/dashboard"
              className="flex items-center gap-1.5 text-fg-muted hover:text-fg hover:underline"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden />
              Back to dashboard
            </Link>
          </div>
        </div>
      </div>

      {/* Right — Brand panel */}
      <div className="relative hidden lg:flex lg:w-[52%] lg:flex-col lg:justify-between lg:overflow-hidden bg-gradient-to-br from-primary via-primary to-accent px-16 py-16 text-fg-on-accent">
        <div className="absolute inset-0 opacity-10" aria-hidden>
          <div className="absolute -right-32 -top-32 h-96 w-96 rounded-full bg-white blur-3xl" />
          <div className="absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-white blur-3xl" />
        </div>
        <div className="relative">
          <p className="text-sm font-medium uppercase tracking-wider opacity-80">
            Admin tools
          </p>
          <h2 className="mt-3 text-[2.25rem] font-bold leading-tight">
            Sign in as any user.
            <br />
            No password needed.
          </h2>
          <p className="mt-4 max-w-md text-[0.9375rem] opacity-90">
            Use the cosplay tool to test accounts, reproduce issues, or verify
            permissions — all without interrupting the user's session.
          </p>
        </div>
      </div>
    </div>
  )
}
