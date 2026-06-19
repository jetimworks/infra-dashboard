import { Navbar } from "../components/layout/Navbar"
import { Card } from "../components/ui/Card"
import { Button } from "../components/ui/Button"
import { Headphones, MessageSquare, Clock, Download, ShieldCheck } from "lucide-react"

export function SupportPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Support & Handover</h1>
          <p className="text-gray-500">Frictionless communication. Zero lock-in.</p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Direct Support */}
          <Card>
            <div className="mb-4 flex items-center gap-2">
              <Headphones className="h-5 w-5 text-blue-600" />
              <h3 className="text-lg font-semibold text-gray-900">Direct Support</h3>
            </div>
            <div className="flex items-center gap-4 mb-6">
              <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-lg">
                JE
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Joshua (Your Dedicated Agent)</p>
                <p className="text-xs text-gray-500">Average response time: 45 minutes</p>
              </div>
            </div>
            <div className="space-y-2">
              <Button className="w-full" variant="outline"><MessageSquare className="h-4 w-4 mr-2" /> Open Support Ticket</Button>
              <Button className="w-full" variant="ghost"><Clock className="h-4 w-4 mr-2" /> View SLA Status</Button>
            </div>
          </Card>

          {/* The Freedom Guarantee */}
          <Card className="border-emerald-200 bg-emerald-50">
            <div className="mb-4 flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-emerald-600" />
              <h3 className="text-lg font-semibold text-emerald-900">The "Freedom" Guarantee</h3>
            </div>
            <p className="text-sm text-emerald-800 mb-4">
              Your infrastructure is 100% portable. We don't believe in lock-in. 
              Download your complete setup and take it anywhere, anytime.
            </p>
            <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white">
              <Download className="h-4 w-4 mr-2" /> Download Infrastructure as Code (IaC)
            </Button>
            <p className="text-xs text-emerald-700 mt-2 text-center">
              Generates a complete Terraform script & Docker Compose file.
            </p>
          </Card>
        </div>
      </main>
    </div>
  )
}
