'use server'

import { db } from '@/lib/db'
import { auditLogs } from '@/lib/db/schema'
import { desc } from 'drizzle-orm'
import { getCurrentUser } from '@/lib/rbac'
import { ROLES } from '@/lib/modules'
import { user } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { logError } from '@/lib/logger'

/**
 * Get audit logs (admin only)
 */
export async function getAuditLogs(limit = 100) {
  const currentUser = await getCurrentUser()
  if (!currentUser) return { error: 'Not authenticated' }

  try {
    // Check if user is admin
    const dbUser = await db.query.user.findFirst({
      where: eq(user.id, currentUser.id),
      with: {
        role: {
          columns: {
            id: true,
          },
        },
      },
    })

    if (dbUser?.role?.id !== ROLES.ADMIN) {
      return { error: 'Unauthorized. Only administrators can view audit logs.' }
    }

    // Fetch audit logs with user information
    const logs = await db.query.auditLogs.findMany({
      orderBy: [desc(auditLogs.createdAt)],
      limit,
      with: {
        user: {
          columns: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    return { success: true, data: logs }
  } catch (error) {
    logError(error, { userId: currentUser.id, action: 'get_audit_logs' })
    return { error: 'Failed to fetch audit logs' }
  }
}
