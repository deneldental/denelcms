import {
  BarChart,
  Calendar,
  ClipboardList,
  CreditCard,
  DollarSign,
  FileText,
  Home,
  MessageSquare,
  Package,
  ScrollText,
  Settings,
  ShoppingBag,
  Users,
} from 'lucide-react'
import { ROLES } from './modules'

export type MenuItem = {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
}

export type MenuConfig = {
  [key: string]: MenuItem[]
}

export const menuItems: MenuConfig = {
  [ROLES.ADMIN]: [
    { label: 'Dashboard', href: '/dashboard', icon: Home },
    { label: 'Patients', href: '/patients', icon: Users },
    { label: 'Appointments', href: '/appointments', icon: Calendar },
    { label: 'Medical Records', href: '/medical-records', icon: ClipboardList },
    { label: 'Ortho Consent', href: '/ortho-consent', icon: FileText },
    { label: 'Inventory', href: '/inventory', icon: Package },
    { label: 'Products', href: '/products', icon: ShoppingBag },
    { label: 'Payments', href: '/payments', icon: CreditCard },
    { label: 'Expenses', href: '/expenses', icon: DollarSign },
    { label: 'Messaging', href: '/messaging', icon: MessageSquare },
    { label: 'Users', href: '/users', icon: Users },
    { label: 'Reports', href: '/reports', icon: BarChart },
    { label: 'Audit Logs', href: '/audit-logs', icon: ScrollText },
    { label: 'Settings', href: '/settings', icon: Settings },
  ],
  [ROLES.DOCTOR]: [
    { label: 'Dashboard', href: '/dashboard', icon: Home },
    { label: 'Patients', href: '/patients', icon: Users },
    { label: 'Appointments', href: '/appointments', icon: Calendar },
    { label: 'Medical Records', href: '/medical-records', icon: ClipboardList },
    { label: 'Ortho Consent', href: '/ortho-consent', icon: FileText },
  ],
  [ROLES.RECEPTIONIST]: [
    { label: 'Dashboard', href: '/dashboard', icon: Home },
    { label: 'Patients', href: '/patients', icon: Users },
    { label: 'Appointments', href: '/appointments', icon: Calendar },
    { label: 'Ortho Consent', href: '/ortho-consent', icon: FileText },
    { label: 'Products', href: '/products', icon: ShoppingBag },
    { label: 'Inventory', href: '/inventory', icon: Package },
    { label: 'Expenses', href: '/expenses', icon: DollarSign },
    { label: 'Payments', href: '/payments', icon: CreditCard },
    { label: 'Messaging', href: '/messaging', icon: MessageSquare },
    { label: 'Reports', href: '/reports', icon: BarChart },
  ],
}

export function getMenuItemsForRole(roleId: string | null | undefined): MenuItem[] {
  if (!roleId) {
    // Default to receptionist menu if no role
    return menuItems[ROLES.RECEPTIONIST]
  }
  return menuItems[roleId] || menuItems[ROLES.RECEPTIONIST]
}
