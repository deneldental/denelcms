'use client'

import { useState } from 'react'
import { Sidebar } from '@/components/dashboard/sidebar'
import { Header } from '@/components/dashboard/header'

interface User {
  id: string
  email: string
  name: string
  roleId: string | null
  image?: string | null
}

interface DashboardShellProps {
  children: React.ReactNode
  user: User | null
}

export function DashboardShell({ children, user }: DashboardShellProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)

  return (
    <div
      className={`grid min-h-screen w-full transition-all duration-300 ${isCollapsed ? 'grid-cols-[80px_1fr]' : 'lg:grid-cols-[280px_1fr]'}`}
    >
      <Sidebar
        isCollapsed={isCollapsed}
        toggleCollapse={() => setIsCollapsed(!isCollapsed)}
        user={user}
      />
      <div className="flex flex-col">
        <Header user={user} toggleSidebar={() => setIsCollapsed(!isCollapsed)} />
        <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">{children}</main>
      </div>
    </div>
  )
}
