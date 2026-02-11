'use server'

import { db } from '@/lib/db'
import { user } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { checkPermission, getCurrentUser } from '@/lib/rbac'
import { MODULES, ACTIONS } from '@/lib/modules'
import { auth } from '@/lib/auth'

export async function getUsers() {
  const currentUser = await getCurrentUser()
  if (!currentUser) return { error: 'Not authenticated' }

  const hasPermission = await checkPermission(currentUser.id, MODULES.USERS, ACTIONS.READ)
  if (!hasPermission) return { error: 'Unauthorized' }

  try {
    const data = await db.query.user.findMany({
      with: {
        role: true,
      },
    })
    return { success: true, data }
  } catch {
    return { error: 'Failed to fetch users' }
  }
}

export async function getUserRole(userId: string) {
  const currentUser = await getCurrentUser()
  if (!currentUser) return { error: 'Not authenticated' }

  try {
    const dbUser = await db.query.user.findFirst({
      where: eq(user.id, userId),
      columns: {
        roleId: true,
      },
    })

    return { success: true, data: dbUser?.roleId || null }
  } catch {
    return { error: 'Failed to fetch user role' }
  }
}

export async function updateUserRole(targetUserId: string, newRoleId: string) {
  const currentUser = await getCurrentUser()
  if (!currentUser) return { error: 'Not authenticated' }

  const hasPermission = await checkPermission(currentUser.id, MODULES.USERS, ACTIONS.UPDATE)
  if (!hasPermission) return { error: 'Unauthorized' }

  try {
    await db.update(user).set({ roleId: newRoleId }).where(eq(user.id, targetUserId))
    revalidatePath('/users')
    return { success: true }
  } catch {
    return { error: 'Failed to update user role' }
  }
}

export async function updateUser(
  targetUserId: string,
  data: {
    name?: string
    phone?: string
    roleId?: string
    password?: string
  }
) {
  const currentUser = await getCurrentUser()
  if (!currentUser) return { error: 'Not authenticated' }

  const hasPermission = await checkPermission(currentUser.id, MODULES.USERS, ACTIONS.UPDATE)
  if (!hasPermission) return { error: 'Unauthorized' }

  try {
    const updates: { name?: string; phone?: string; roleId?: string } = {}
    if (data.name !== undefined) updates.name = data.name
    if (data.phone !== undefined) updates.phone = data.phone
    if (data.roleId !== undefined) updates.roleId = data.roleId

    if (Object.keys(updates).length > 0) {
      await db.update(user).set(updates).where(eq(user.id, targetUserId))
    }

    // Handle password update separately through Better Auth
    if (data.password && data.password.trim() !== '') {
      try {
        // Use Admin API to force set password (correctly hashes using Scrypt)
        await auth.api.setUserPassword({
          body: {
            userId: targetUserId,
            newPassword: data.password,
          },
        })
      } catch (error) {
        console.error('Failed to set user password:', error)
        // Throw error to propagate failure to UI
        throw new Error('Failed to update password')
      }
    }

    revalidatePath('/users')
    return { success: true }
  } catch {
    return { error: 'Failed to update user' }
  }
}

export async function deleteUser(targetUserId: string) {
  const currentUser = await getCurrentUser()
  if (!currentUser) return { error: 'Not authenticated' }

  const hasPermission = await checkPermission(currentUser.id, MODULES.USERS, ACTIONS.DELETE)
  if (!hasPermission) return { error: 'Unauthorized' }

  try {
    await db.delete(user).where(eq(user.id, targetUserId))
    revalidatePath('/users')
    return { success: true }
  } catch {
    return { error: 'Failed to delete user' }
  }
}

export async function getRoles() {
  const currentUser = await getCurrentUser()
  if (!currentUser) return { error: 'Not authenticated' }

  const hasPermission = await checkPermission(currentUser.id, MODULES.USERS, ACTIONS.READ)
  if (!hasPermission) return { error: 'Unauthorized' }

  try {
    const data = await db.query.roles.findMany()
    return { success: true, data }
  } catch {
    return { error: 'Failed to fetch roles' }
  }
}

export async function createUser(data: {
  name: string
  email: string
  phone?: string
  password: string
  roleId?: string
}) {
  const currentUser = await getCurrentUser()
  if (!currentUser) return { error: 'Not authenticated' }

  const hasPermission = await checkPermission(currentUser.id, MODULES.USERS, ACTIONS.CREATE)
  if (!hasPermission) return { error: 'Unauthorized' }

  try {
    // 1. Create user using Better Auth API (handles hashing and account creation)
    // Note: This might create a session, but since we're in a server action,
    // we rely on the specific behavior of better-auth next-js plugin.
    // If it sets a cookie, it might log the admin out.
    // However, for now, this is the only reliable way to get the correct password hash.
    const res = await auth.api.signUpEmail({
      body: {
        email: data.email,
        password: data.password,
        name: data.name,
      }
    })

    // 2. Update the user with additional fields (phone, role, verified)
    // Fetch the user first to get the ID (email is unique)
    const newUser = await db.query.user.findFirst({
      where: eq(user.email, data.email),
    })

    if (newUser) {
      await db.update(user).set({
        phone: data.phone || null,
        roleId: data.roleId || null,
        emailVerified: true, // Auto-verify users created by admin
        updatedAt: new Date(),
      }).where(eq(user.id, newUser.id))
    }

    revalidatePath('/users')
    return { success: true }
  } catch (error: unknown) {
    // Handle duplicate email error
    const errorMessage = error instanceof Error ? error.message : String(error)
    // Better Auth API might throw specific errors
    if (errorMessage.includes('email') || errorMessage.includes('unique') || errorMessage.includes('User already exists')) {
      return { error: 'Email already exists' }
    }
    return { error: `Failed to create user: ${errorMessage}` }
  }
}
