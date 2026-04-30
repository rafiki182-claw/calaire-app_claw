import type { ReactNode } from 'react'

import { isAdmin, requireAuth } from '@/lib/auth'

import { Sidebar } from './SidebarNav'

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const auth = await requireAuth()
  const admin = isAdmin(auth)

  if (!admin) {
    return <>{children}</>
  }

  return (
    <div className="flex flex-col min-h-screen bg-[var(--background)]">
      <Sidebar />
      <div className="flex-1 min-w-0">
        {children}
      </div>
    </div>
  )
}
