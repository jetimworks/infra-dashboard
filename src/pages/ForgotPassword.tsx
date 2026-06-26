import { Link } from "react-router-dom"
import {
  Cloud,
  Mail,
  LifeBuoy,
  MessageCircle,
  ShieldCheck,
} from "lucide-react"
import { cn } from "../lib/utils"

export function ForgotPasswordPage() {
  return (
    <div className="flex min-h-screen">
      {/* Left — Brand panel */}
      <div className="relative hidden lg:flex lg:w-[52%] lg:flex-col lg:justify-between lg:overflow-hidden bg-gradient-to-br from-primary via-primary to-accent px-16 py-16 text-fg-on-accent">
        <div className="absolute inset-0 opacity-10" aria-hidden>
          <div className="absolute -right-32 -top-32 h-96 w-96 rounded-full bg-white blur-3xl" />
          <div className="absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-white blur-3xl" />
        </div>

        <div className="relative">
          <p className="text-sm font-medium uppercase tracking-wider opacity-80">
            You're not alone
          </p>
          <h2 className="mt-3 text-[2.25rem] font-bold leading-tight">
            Forgotten passwords
            <br />
            happen to everyone.
          </h2>
          <p className="mt-4 max-w-md text-[0.9375rem] opacity-90">
            We've got you. Our team can verify who you are and get you back in
            within minutes.
          </p>
        </div>

        <div className="relative grid grid-cols-1 gap-4">
          <Reassure
            icon={ShieldCheck}
            title="Verified by a real person"
            description="No automated reset links. We confirm it's you, then we fix it."
          />
          <Reassure
            icon={MessageCircle}
            title="Quick response"
            description="Most password requests are handled within a few minutes during business hours."
          />
        </div>
      </div>

      {/* Right — Form */}
      <div className="relative flex w-full flex-col justify-center bg-bg px-6 py-10 lg:w-[48%] lg:px-16 xl:px-24">
        <div className="absolute right-0 top-0 h-1 w-full accent-bar-top lg:bottom-0 lg:left-0 lg:right-auto lg:h-full lg:w-1" aria-hidden />
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
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-lg bg-primary-soft text-primary-soft-fg">
              <LifeBuoy className="h-6 w-6" aria-hidden />
            </div>
            <h1 className="text-[2rem] font-bold leading-tight text-fg tracking-tight">
              Forgot your password?
            </h1>
            <p className="mt-2 text-[0.9375rem] text-fg-muted">
              Send us a quick email and we'll help you get back in. We'll
              confirm it's you first, then reset it.
            </p>
          </div>

          <div className="rounded-lg border border-border/50 bg-surface p-5">
            <h2 className="text-[0.9375rem] font-semibold text-fg">
              What to do
            </h2>
            <ol className="mt-3 space-y-2.5 text-sm text-fg-muted">
              <li className="flex gap-3">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary-soft text-[0.6875rem] font-semibold text-primary-soft-fg">
                  1
                </span>
                <span>
                  Email us at{" "}
                  <a
                    href="mailto:support@jetimworks.com"
                    className="font-medium text-primary hover:underline"
                  >
                    support@jetimworks.com
                  </a>
                </span>
              </li>
              <li className="flex gap-3">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary-soft text-[0.6875rem] font-semibold text-primary-soft-fg">
                  2
                </span>
                <span>
                  Tell us the email address on your account and a phone number
                  we can reach you on
                </span>
              </li>
              <li className="flex gap-3">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary-soft text-[0.6875rem] font-semibold text-primary-soft-fg">
                  3
                </span>
                <span>
                  We'll verify you and send a temporary password right away
                </span>
              </li>
            </ol>

            <a
              href="mailto:support@jetimworks.com?subject=Password%20reset%20request"
              className={cn(
                "mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-md bg-primary px-5 text-[1.0625rem] font-medium text-fg-on-accent shadow-sm transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
              )}
            >
              <Mail className="h-4 w-4" aria-hidden />
              Email support
            </a>
          </div>

          <p className="mt-6 text-center text-sm text-fg-muted">
            Remembered it?{" "}
            <Link to="/login" className="font-medium text-primary hover:underline">
              Sign in
            </Link>
          </p>

          <p className="mt-8 text-center text-xs text-fg-subtle">
            We don't have automated password resets yet — a real human will
            help. That means it's always safe, just a little slower than a
            button.
          </p>
        </div>
      </div>
    </div>
  )
}

function Reassure({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof LifeBuoy
  title: string
  description: string
}) {
  return (
    <div className="rounded-lg bg-white/10 p-4 backdrop-blur-sm">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 opacity-90" aria-hidden />
        <p className="text-sm font-semibold">{title}</p>
      </div>
      <p className="mt-1.5 text-[0.8125rem] opacity-90">{description}</p>
    </div>
  )
}
