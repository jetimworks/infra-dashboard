import { Link, useNavigate } from "react-router-dom"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useAuth } from "../auth/useAuth"
import { Button } from "../components/ui/Button"
import { AuthBrandPanel } from "../components/layout/AuthBrandPanel"
import { Input } from "../components/ui/Input"
import { Field } from "../components/ui/Input"
import {
  Cloud,
  Mail,
  Lock,
  ArrowRight,
  User,
  Phone,
  CheckCircle2,
  ShieldCheck,
  Sparkles,
} from "lucide-react"
import { normalizeError } from "../api/errors"

const registerSchema = z
  .object({
    first_name: z.string().min(1, "Tell us what to call you"),
    last_name: z.string().min(1, "Tell us what to call you"),
    email: z.string().email("Enter a valid email address"),
    phone: z.string().min(1, "We need a number we can reach you on"),
    password: z
      .string()
      .min(8, "Use at least 8 characters — long ones are safer"),
    confirm_password: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: "The two passwords don't match",
    path: ["confirm_password"],
  })

type RegisterForm = z.infer<typeof registerSchema>

export function RegisterPage() {
  const { register: registerUser } = useAuth()
  const navigate = useNavigate()
  const [registerError, setRegisterError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  })

  const onSubmit = async (data: RegisterForm) => {
    setRegisterError(null)
    try {
      await registerUser({
        email: data.email,
        phone: data.phone,
        password: data.password,
        first_name: data.first_name,
        last_name: data.last_name,
      })
      // AuthProvider.register calls login() which handles onboarding redirects.
      // If we somehow land here (e.g. user manually navigated), send to dashboard.
      navigate("/dashboard", { replace: true })
    } catch (err) {
      setRegisterError(normalizeError(err).message)
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* Left — Brand panel */}
      <AuthBrandPanel
        eyebrow="Welcome to Infra"
        headline={
          <>
            Set up in minutes.
            <br />
            Sleep well after.
          </>
        }
        body="Create your account and we'll start watching over your servers, databases, and storage right away."
      >
        <div className="space-y-3">
          <Promise
            icon={CheckCircle2}
            text="No credit card needed to get started"
          />
          <Promise
            icon={ShieldCheck}
            text="Your data is encrypted end to end"
          />
          <Promise
            icon={Sparkles}
            text="Cancel anytime — no questions, no fuss"
          />
        </div>
      </AuthBrandPanel>

      {/* Right — Form */}
      <div className="relative flex w-full flex-col justify-center bg-bg px-6 py-10 lg:w-[48%] lg:px-16 xl:px-24">
        <div className="absolute right-0 top-0 h-1 w-full bg-primary lg:bottom-0 lg:left-0 lg:right-auto lg:h-full lg:w-1" aria-hidden />
        <div className="mx-auto w-full max-w-md">
          <div className="mb-10 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary text-fg-on-accent">
              <Cloud className="h-5 w-5" aria-hidden />
            </div>
            <div>
              <p className="text-lead font-semibold text-fg">Infra</p>
              <p className="text-xs text-fg-muted">by Jetimworks</p>
            </div>
          </div>

          <div className="mb-8">
            <h1 className="font-display text-[2rem] font-semibold leading-tight text-fg tracking-tight">
              Create your account
            </h1>
            <p className="mt-2 text-body text-fg-muted">
              A few details and you're in. We'll never share your information.
            </p>
          </div>

          {registerError ? (
            <div
              role="alert"
              className="mb-6 rounded-md border border-danger-soft bg-danger-soft p-3 text-sm text-danger-fg"
            >
              {registerError}
            </div>
          ) : null}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <Field
                label="First name"
                htmlFor="first_name"
                required
                error={errors.first_name?.message}
              >
                <Input
                  id="first_name"
                  placeholder="Jane"
                  autoComplete="given-name"
                  leftIcon={User}
                  aria-invalid={errors.first_name ? "true" : undefined}
                  {...register("first_name")}
                />
              </Field>
              <Field
                label="Last name"
                htmlFor="last_name"
                required
                error={errors.last_name?.message}
              >
                <Input
                  id="last_name"
                  placeholder="Doe"
                  autoComplete="family-name"
                  leftIcon={User}
                  aria-invalid={errors.last_name ? "true" : undefined}
                  {...register("last_name")}
                />
              </Field>
            </div>

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
              label="Phone number"
              htmlFor="phone"
              required
              hint="So we can reach you if something needs urgent attention"
              error={errors.phone?.message}
            >
              <Input
                id="phone"
                type="tel"
                placeholder="+1 555 123 4567"
                autoComplete="tel"
                leftIcon={Phone}
                aria-invalid={errors.phone ? "true" : undefined}
                {...register("phone")}
              />
            </Field>

            <Field
              label="Choose a password"
              htmlFor="password"
              required
              hint="At least 8 characters — a sentence works great"
              error={errors.password?.message}
            >
              <Input
                id="password"
                type="password"
                placeholder="At least 8 characters"
                autoComplete="new-password"
                leftIcon={Lock}
                aria-invalid={errors.password ? "true" : undefined}
                {...register("password")}
              />
            </Field>

            <Field
              label="Confirm password"
              htmlFor="confirm_password"
              required
              error={errors.confirm_password?.message}
            >
              <Input
                id="confirm_password"
                type="password"
                placeholder="Type it again"
                autoComplete="new-password"
                leftIcon={Lock}
                aria-invalid={errors.confirm_password ? "true" : undefined}
                {...register("confirm_password")}
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
              {isSubmitting ? "Creating your account…" : "Create my account"}
            </Button>
          </form>

          <p className="mt-8 text-center text-sm text-fg-muted">
            Already have an account?{" "}
            <Link to="/login" className="font-medium text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

function Promise({
  icon: Icon,
  text,
}: {
  icon: typeof CheckCircle2
  text: string
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-appbar-line bg-appbar-raised px-4 py-3">
      <Icon className="h-5 w-5 text-appbar-muted" aria-hidden />
      <p className="text-caption font-medium text-appbar-fg">{text}</p>
    </div>
  )
}
