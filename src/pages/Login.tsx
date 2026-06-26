import { Link, useNavigate } from "react-router-dom"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useAuth } from "../auth/useAuth"
import { Button } from "../components/ui/Button"
import { Input } from "../components/ui/Input"
import { Field } from "../components/ui/Input"
import { Cloud, Mail, Lock, ArrowRight, ShieldCheck, Sparkles, Activity } from "lucide-react"
import { normalizeError } from "../api/errors"

const loginSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
})

type LoginForm = z.infer<typeof loginSchema>

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [loginError, setLoginError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginForm) => {
    setLoginError(null)
    try {
      await login(data)
      // AuthProvider.login handles onboarding redirects, but if we land here
      // (e.g. user manually navigated), send them to the dashboard.
      navigate("/dashboard", { replace: true })
    } catch (err) {
      setLoginError(normalizeError(err).message)
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* Left — Form */}
      <div className="relative flex w-full flex-col justify-center bg-bg px-6 py-10 lg:w-[48%] lg:px-16 xl:px-24">
        <div className="absolute left-0 right-0 top-0 h-1 accent-bar-top lg:left-0 lg:right-auto lg:h-full lg:w-1" aria-hidden />
        <div className="mx-auto w-full max-w-md">
          <div className="mb-10 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary text-fg-on-accent shadow-sm shadow-primary/30">
              <Cloud className="h-5 w-5" aria-hidden />
            </div>
            <div>
              <p className="text-[1.0625rem] font-semibold text-fg">Infra</p>
              <p className="text-xs text-fg-muted">by Jetimworks</p>
            </div>
          </div>

          <div className="mb-8">
            <h1 className="text-[2rem] font-bold leading-tight text-fg tracking-tight">
              Welcome back
            </h1>
            <p className="mt-2 text-[0.9375rem] text-fg-muted">
              Sign in to see how your servers are doing.
            </p>
          </div>

          {loginError ? (
            <div
              role="alert"
              className="mb-6 rounded-md border border-danger-soft bg-danger-soft p-3 text-sm text-danger-fg"
            >
              {loginError}
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
                placeholder="you@company.com"
                autoComplete="email"
                leftIcon={Mail}
                aria-invalid={errors.email ? "true" : undefined}
                {...register("email")}
              />
            </Field>

            <Field
              label="Password"
              htmlFor="password"
              required
              hint={
                <Link
                  to="/forgot-password"
                  className="text-primary hover:underline"
                >
                  Forgot it?
                </Link>
              }
              error={errors.password?.message}
            >
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                autoComplete="current-password"
                leftIcon={Lock}
                aria-invalid={errors.password ? "true" : undefined}
                {...register("password")}
              />
            </Field>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              isLoading={isSubmitting}
              rightIcon={ArrowRight}
            >
              {isSubmitting ? "Signing you in…" : "Sign in"}
            </Button>
          </form>

          <p className="mt-8 text-center text-sm text-fg-muted">
            Don't have an account yet?{" "}
            <Link to="/register" className="font-medium text-primary hover:underline">
              Create one
            </Link>
          </p>
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
            Your infrastructure, looked after
          </p>
          <h2 className="mt-3 text-[2.25rem] font-bold leading-tight">
            Sleep at night.
            <br />
            We've got your back.
          </h2>
          <p className="mt-4 max-w-md text-[0.9375rem] opacity-90">
            We monitor your servers, databases, and storage, alert you when
            something needs attention, and explain it all in plain English.
          </p>
        </div>

        <div className="relative grid grid-cols-3 gap-6">
          <Feature
            icon={ShieldCheck}
            label="Security"
            value="We watch for threats 24/7"
          />
          <Feature
            icon={Activity}
            label="Health"
            value="Live status of every server"
          />
          <Feature
            icon={Sparkles}
            label="Backups"
            value="Daily, automatic, restorable"
          />
        </div>
      </div>
    </div>
  )
}

function Feature({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof ShieldCheck
  label: string
  value: string
}) {
  return (
    <div className="rounded-lg bg-white/10 p-4 backdrop-blur-sm">
      <Icon className="h-5 w-5 opacity-90" aria-hidden />
      <p className="mt-2 text-[0.6875rem] font-medium uppercase tracking-wider opacity-80">
        {label}
      </p>
      <p className="mt-1 text-sm font-medium">{value}</p>
    </div>
  )
}
