import { Card } from "../components/ui/Card"
import { Button } from "../components/ui/Button"
import { Headphones, MessageSquare, Clock, Download, ShieldCheck } from "lucide-react"

export function SupportPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[var(--text-primary)]">Support & Handover</h1>
        <p className="text-[var(--text-secondary)]">Frictionless communication. Zero lock-in.</p>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Direct Support */}
        <Card className="p-8 bg-[var(--card-bg)] border border-[var(--border-color)]">
          <div className="mb-6 flex items-center gap-3">
            <Headphones className="h-5 w-5 text-blue-500" />
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">Direct Support</h3>
          </div>
          <div className="flex items-center gap-5 mb-6">
            <div className="h-14 w-14 rounded-full bg-[var(--accent)] flex items-center justify-center text-white font-bold text-lg">
              JE
            </div>
            <div>
              <p className="text-sm font-medium text-[var(--text-primary)]">Joshua (Your Dedicated Agent)</p>
              <p className="text-xs text-[var(--text-secondary)]">Average response time: 45 minutes</p>
            </div>
          </div>
          <div className="space-y-3">
            <Button className="w-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white" variant="outline"><MessageSquare className="h-4 w-4 mr-2" /> Open Support Ticket</Button>
            <Button className="w-full text-[var(--text-secondary)] hover:text-[var(--text-primary)]" variant="ghost"><Clock className="h-4 w-4 mr-2" /> View SLA Status</Button>
          </div>
        </Card>

        {/* The Freedom Guarantee */}
        <Card className="p-8 border-[var(--success)]/30 bg-[var(--success-subtle)]">
          <div className="mb-6 flex items-center gap-3">
            <ShieldCheck className="h-5 w-5 text-[var(--success)]" />
            <h3 className="text-lg font-semibold text-[var(--success)]">The "Freedom" Guarantee</h3>
          </div>
          <p className="text-sm text-[var(--text-secondary)] mb-5">
            Your infrastructure is 100% portable. We don't believe in lock-in.
            Download your complete setup and take it anywhere, anytime.
          </p>
          <Button className="w-full bg-[var(--success)] hover:bg-[var(--success)]/90 text-white">
            <Download className="h-4 w-4 mr-2" /> Download Infrastructure as Code (IaC)
          </Button>
          <p className="text-xs text-[var(--text-secondary)] mt-3 text-center">
            Generates a complete Terraform script & Docker Compose file.
          </p>
        </Card>
      </div>
    </div>
  )
}
