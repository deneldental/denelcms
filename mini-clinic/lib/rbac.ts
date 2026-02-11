import { db } from '@/lib/db'
import { user } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { auth } from './auth'
import { headers } from 'next/headers'

export async function checkPermission(
  userId: string,
  module: string,
  action: string
): Promise<boolean> {
  try {
    // 1. Get user with role
    const dbUser = await db.query.user.findFirst({
      where: eq(user.id, userId),
      with: {
        role: {
          with: {
            permissions: {
              with: {
                permission: true,
              },
            },
          },
        },
      },
    })

    if (!dbUser) {
      console.warn(`[RBAC] User ${userId} not found`)
      return false
    }

    if (!dbUser.role) {
      console.warn(`[RBAC] User ${userId} has no role assigned`)
      return false
    }

    // Admin has all permissions
    if (dbUser.role.id === 'admin') return true

    // 2. Check permissions
    // @ts-ignore - drizzle relations typing can be tricky with deep nesting
    const permissions = dbUser.role.permissions?.map((rp) => rp.permission) || []

    if (permissions.length === 0) {
      console.warn(`[RBAC] Role ${dbUser.role.id} has no permissions assigned`)
      return false
    }

    const hasPermission = permissions.some((p: any) => p.module === module && p.action === action)

    if (!hasPermission) {
      console.warn(
        `[RBAC] User ${userId} (role: ${dbUser.role.id}) lacks permission: ${module}.${action}`
      )
    }

    return hasPermission
  } catch (error) {
    console.error('[RBAC] Error checking permission:', error)
    return false
  }
}

export async function getCurrentUser() {
  const session = await auth.api.getSession({
    headers: await headers(),
  })
  return session?.user
}

export async function isDoctorOrAdmin(userId: string): Promise<boolean> {
  try {
    const dbUser = await db.query.user.findFirst({
      where: eq(user.id, userId),
      with: {
        role: true,
      },
    })

    if (!dbUser || !dbUser.role) {
      return false
    }

    // Check if user is admin or doctor
    return dbUser.role.id === 'admin' || dbUser.role.id === 'doctor'
  } catch (error) {
    console.error('[RBAC] Error checking role:', error)
    return false
  }
}
