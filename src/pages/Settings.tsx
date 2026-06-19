import { Card } from "../components/ui/Card"
import { Button } from "../components/ui/Button"
import { Bell, Shield, Palette } from "lucide-react"
import { useTheme } from "../hooks/useTheme"

export function SettingsPage() {
  const { theme, toggleTheme } = useTheme()

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[var(--text-primary)]">Settings</h1>
        <p className="text-[var(--text-secondary)]">Manage your preferences and configuration.</p>
      </div>

      <div className="space-y-6 max-w-2xl">
        {/* Notifications */}
        <Card className="p-8 bg-[var(--card-bg)] border border-[var(--border-color)]">
          <div className="flex items-center gap-3 mb-6">
            <Bell className="h-5 w-5 text-[var(--accent)]" />
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">Notifications</h2>
          </div>
          <div className="space-y-5">
            <SettingRow label="Email notifications" description="Receive email updates about your infrastructure">
              <Toggle defaultChecked />
            </SettingRow>
            <SettingRow label="Alert notifications" description="Get notified when thresholds are exceeded">
              <Toggle defaultChecked />
            </SettingRow>
            <SettingRow label="Weekly digest" description="Summary of weekly activity and performance">
              <Toggle />
            </SettingRow>
          </div>
        </Card>

        {/* Appearance */}
        <Card className="p-8 bg-[var(--card-bg)] border border-[var(--border-color)]">
          <div className="flex items-center gap-3 mb-6">
            <Palette className="h-5 w-5 text-purple-500" />
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">Appearance</h2>
          </div>
          <div className="space-y-5">
            <SettingRow label="Dark mode" description="Use dark theme for the interface">
              <Toggle checked={theme === "dark"} onChange={toggleTheme} />
            </SettingRow>
            <SettingRow label="Compact view" description="Reduce spacing for denser information display">
              <Toggle />
            </SettingRow>
          </div>
        </Card>

        {/* Security */}
        <Card className="p-8 bg-[var(--card-bg)] border border-[var(--border-color)]">
          <div className="flex items-center gap-3 mb-6">
            <Shield className="h-5 w-5 text-[var(--success)]" />
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">Security</h2>
          </div>
          <div className="space-y-5">
            <SettingRow label="Two-factor authentication" description="Add an extra layer of security to your account">
              <Button size="sm" variant="outline" className="border-[var(--border-color)] text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]">Enable</Button>
            </SettingRow>
            <SettingRow label="Session timeout" description="Auto-logout after period of inactivity">
              <Button size="sm" variant="outline" className="border-[var(--border-color)] text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]">Configure</Button>
            </SettingRow>
          </div>
        </Card>
      </div>
    </div>
  )
}

function SettingRow({ label, description, children }: { label: string; description: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-2">
      <div>
        <p className="text-sm font-medium text-[var(--text-primary)]">{label}</p>
        <p className="text-xs text-[var(--text-secondary)]">{description}</p>
      </div>
      {children}
    </div>
  )
}

interface ToggleProps {
  defaultChecked?: boolean
  checked?: boolean
  onChange?: () => void
}

function Toggle({ defaultChecked = false, checked, onChange }: ToggleProps) {
  const isChecked = checked !== undefined ? checked : defaultChecked

  return (
    <button
      onClick={onChange}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
        isChecked ? "bg-[var(--accent)]" : "bg-[var(--border-color)]"
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
          isChecked ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  )
}
