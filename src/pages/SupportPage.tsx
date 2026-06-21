import { useState } from "react"
import {
  ChevronDown,
  LifeBuoy,
  Mail,
  MessageCircle,
  Phone,
} from "lucide-react"
import { Card, CardHeader, CardTitle } from "../components/ui/Card"
import { cn } from "../lib/utils"

interface FaqItem {
  q: string
  a: string
}

const faqs: FaqItem[] = [
  {
    q: "What happens if one of my servers goes down?",
    a: "We monitor every server, database, and storage bucket around the clock. The moment something stops responding, our team gets paged, looks at it, and reaches out to you with what we found and what we're doing about it.",
  },
  {
    q: "How often are backups taken?",
    a: "Databases and caches are backed up automatically every day. You can also trigger a backup manually from the backups page whenever you want — for example, right before a big change.",
  },
  {
    q: "Can I restore from an older backup?",
    a: "Yes. On any database's backups page, pick the snapshot you want and confirm. We'll restore it for you. Please note that restoring overwrites everything in the database from that point forward, so use it carefully.",
  },
  {
    q: "What's a security check, and should I worry when it finds something?",
    a: "A security check looks at the things that matter most: are software updates installed, is the firewall on, are passwords strong, is encryption turned on. When we flag something, it's almost always a small thing to fix. We'll tell you exactly what to do.",
  },
  {
    q: "How do I add another server?",
    a: "Email support@jetimworks.com and we'll walk you through it. We'll set up the hardware, install your stack, and hand it over once it's running smoothly.",
  },
  {
    q: "Do I need to know how to code to use Infra?",
    a: "Not at all. Infra is built for non-technical owners. The dashboard shows you what you need to know in plain English, and our team handles anything technical that comes up.",
  },
]

export function SupportPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(0)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[1.75rem] font-bold leading-tight text-fg tracking-tight">
          Support
        </h1>
        <p className="mt-1 text-[0.9375rem] text-fg-muted">
          Answers to common questions, plus a direct line to our team.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-3">
          {faqs.map((faq, i) => (
            <Card key={i} padding="sm">
              <button
                type="button"
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                aria-expanded={openIndex === i}
                className="flex w-full items-center justify-between gap-3 px-2 py-2 text-left"
              >
                <span className="text-sm font-medium text-fg">{faq.q}</span>
                <ChevronDown
                  className={cn(
                    "h-4 w-4 shrink-0 text-fg-muted transition-transform duration-200",
                    openIndex === i && "rotate-180"
                  )}
                  aria-hidden
                />
              </button>
              {openIndex === i ? (
                <p className="px-2 pb-3 text-sm text-fg-muted">{faq.a}</p>
              ) : null}
            </Card>
          ))}
        </div>
        <div>
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <LifeBuoy className="h-4 w-4 text-primary" aria-hidden />
                <CardTitle>Get in touch</CardTitle>
              </div>
            </CardHeader>
            <p className="text-sm text-fg-muted">
              We typically reply within a few hours during business hours, and
              we're on call for anything urgent.
            </p>
            <div className="mt-5 space-y-3">
              <ContactRow
                icon={Mail}
                label="Email"
                value="support@jetimworks.com"
                href="mailto:support@jetimworks.com"
              />
              <ContactRow
                icon={Phone}
                label="Phone (urgent)"
                value="+1 (555) 123-4567"
                href="tel:+15551234567"
              />
              <ContactRow
                icon={MessageCircle}
                label="Live chat"
                value="Available 9am – 6pm in your timezone"
              />
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

function ContactRow({
  icon: Icon,
  label,
  value,
  href,
}: {
  icon: typeof LifeBuoy
  label: string
  value: string
  href?: string
}) {
  const inner = (
    <div className="flex items-start gap-3 rounded-md p-2 hover:bg-surface-sunken">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary-soft text-primary">
        <Icon className="h-4 w-4" aria-hidden />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-fg-muted">{label}</p>
        <p className="truncate text-sm font-medium text-fg">{value}</p>
      </div>
    </div>
  )
  if (href) {
    return (
      <a href={href} className="block">
        {inner}
      </a>
    )
  }
  return inner
}
