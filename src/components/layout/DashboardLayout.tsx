import { Outlet } from "react-router-dom"
import { Sidebar } from "./Sidebar"
import { Header } from "./Header"

export function DashboardLayout() {
  return (
    <div className="flex h-screen bg-[var(--bg-primary)]">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-auto bg-[var(--bg-primary)]">
          <div className="min-h-full p-12">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
