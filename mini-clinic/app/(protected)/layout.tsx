import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { DashboardShell } from '@/components/dashboard/dashboard-shell'
import { db } from '@/lib/db'
import { user } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { checkPermission } from '@/lib/rbac'
import { MODULES, ACTIONS, ROLES } from '@/lib/modules'

type RoutePermission = {
  prefix: string
  module: (typeof MODULES)[keyof typeof MODULES]
}

const ROUTE_PERMISSIONS: RoutePermission[] = [
  { prefix: '/patients', module: MODULES.PATIENTS },
  { prefix: '/appointments', module: MODULES.APPOINTMENTS },
  { prefix: '/medical-records', module: MODULES.MEDICAL_RECORDS },
  { prefix: '/inventory', module: MODULES.INVENTORY },
  { prefix: '/products', module: MODULES.PRODUCTS },
  { prefix: '/payments', module: MODULES.PAYMENTS },
  { prefix: '/expenses', module: MODULES.EXPENSES },
  { prefix: '/messaging', module: MODULES.MESSAGING },
  { prefix: '/users', module: MODULES.USERS },
  { prefix: '/reports', module: MODULES.REPORTS },
  { prefix: '/tax-calculations', module: MODULES.REPORTS },
]

const ADMIN_ONLY_PREFIXES = ['/settings']

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const requestHeaders = await headers()
  const session = await auth.api.getSession({
    headers: requestHeaders,
  })

  if (!session) {
    redirect('/auth/login')
  }

  // Fetch user with roleId and role name from database
  const dbUser = await db.query.user.findFirst({
    where: eq(user.id, session.user.id),
    columns: {
      id: true,
      name: true,
      email: true,
      phone: true,
      image: true,
      roleId: true,
    },
    with: {
      role: {
        columns: {
          id: true,
          name: true,
        },
      },
    },
  })

  const userWithRole = {
    ...session.user,
    roleId: dbUser?.roleId || null,
    role: dbUser?.role || null, // Include the full role object with name
  }

  const rawPathname = requestHeaders.get('x-pathname') || ''
  const pathname = rawPathname.split('?')[0].split('#')[0]

  if (pathname) {
    if (ADMIN_ONLY_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
      if (dbUser?.role?.id !== ROLES.ADMIN) {
        redirect('/dashboard')
      }
    } else {
      const matched = ROUTE_PERMISSIONS.find(({ prefix }) => pathname.startsWith(prefix))
      if (matched) {
        const hasAccess = await checkPermission(session.user.id, matched.module, ACTIONS.READ)
        if (!hasAccess) {
          redirect('/dashboard')
        }
      }
    }
  }

  return <DashboardShell user={userWithRole}>{children}</DashboardShell>
}
