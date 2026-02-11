'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Wallet } from 'lucide-react'
import { getMenuItemsForRole, type MenuItem } from '@/lib/menu'

interface User {
  roleId: string | null
}

interface SidebarProps {
  isCollapsed: boolean
  toggleCollapse: () => void
  user: User | null
}

export function Sidebar({ isCollapsed, user }: SidebarProps) {
  const pathname = usePathname()
  const menuItems = getMenuItemsForRole(user?.roleId)

  return (
    <div className="hidden border-r bg-gray-100/40 lg:block dark:bg-gray-800/40 min-h-screen">
      <div className="flex h-full max-h-screen flex-col gap-2">
        <div
          className={`flex h-[60px] items-center border-b ${isCollapsed ? 'justify-center px-2' : 'px-6'}`}
        >
          <Link className="flex items-center gap-2 font-semibold" href="#">
            <Wallet className="h-6 w-6" />
            <span className={isCollapsed ? 'hidden' : ''}>Clinic</span>
          </Link>
        </div>

        <div className="flex-1 overflow-auto py-2">
          <nav className="grid items-start px-2 text-sm font-medium">
            {menuItems.map((item: MenuItem, index: number) => (
              <Link
                key={index}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-gray-500 transition-all hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-50 ${pathname === item.href ? 'bg-gray-200 text-gray-900 dark:bg-gray-700 dark:text-gray-50 shadow-sm' : ''} ${isCollapsed ? 'justify-center' : ''}`}
                href={item.href}
              >
                <item.icon className="h-4 w-4" />
                <span className={isCollapsed ? 'hidden' : ''}>{item.label}</span>
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </div>
  )
}
