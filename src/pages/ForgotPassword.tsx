import { Link } from "react-router-dom"
import {
  Cloud,
  Mail,
  LifeBuoy,
  MessageCircle,
  ShieldCheck,
} from "lucide-react"
import { cn } from "../lib/utils"
import { AuthBrandPanel } from "../components/layout/AuthBrandPanel"

export function ForgotPasswordPage() {
  return (
    <div className="flex min-h-screen">
      {/* Left — Brand panel */}
      <AuthBrandPanel
        eyebrow="You are not alone"
        headline={
          <>
            Forgotten passwords
            <br />
            happen to everyone.
          </>
        }
        body="We have got you. Our team can verify who you are and get you back in within minutes."
      >
        <div className="grid grid-cols-1 gap-3">
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
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-lg bg-primary-soft text-primary-soft-fg">
              <LifeBuoy className="h-6 w-6" aria-hidden />
            </div>
            <h1 className="font-display text-[2rem] font-semibold leading-tight text-fg tracking-tight">
              Forgot your password?
            </h1>
            <p className="mt-2 text-body text-fg-muted">
              Send us a quick email and we'll help you get back in. We'll
              confirm it's you first, then reset it.
            </p>
          </div>

          <div className="rounded-lg border border-border/50 bg-surface p-5">
            <h2 className="text-body font-semibold text-fg">
              What to do
            </h2>
            <ol className="mt-3 space-y-2.5 text-sm text-fg-muted">
              <li className="flex gap-3">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary-soft text-micro font-semibold text-primary-soft-fg">
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
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary-soft text-micro font-semibold text-primary-soft-fg">
                  2
                </span>
                <span>
                  Tell us the email address on your account and a phone number
                  we can reach you on
                </span>
              </li>
              <li className="flex gap-3">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary-soft text-micro font-semibold text-primary-soft-fg">
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
                "mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-md bg-primary px-5 text-lead font-medium text-fg-on-accent shadow-sm transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
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
    <div className="rounded-lg border border-appbar-line bg-appbar-raised p-4">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-appbar-muted" aria-hidden />
        <p className="text-caption font-semibold text-appbar-fg">{title}</p>
      </div>
      <p className="mt-1.5 text-caption text-appbar-muted">{description}</p>
    </div>
  )
}
