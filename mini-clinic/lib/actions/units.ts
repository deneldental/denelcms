'use server'

import { db } from '@/lib/db'
import { units, user } from '@/lib/db/schema'
import { eq, asc } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { getCurrentUser } from '@/lib/rbac'

export async function getUnits() {
  const currentUser = await getCurrentUser()
  if (!currentUser) return { error: 'Not authenticated' }

  try {
    const data = await db.select().from(units).where(eq(units.isActive, true)).orderBy(units.name)
    return { success: true, data }
  } catch {
    return { error: 'Failed to fetch units' }
  }
}

export async function getAllUnits() {
  const currentUser = await getCurrentUser()
  if (!currentUser) return { error: 'Not authenticated' }

  // Fetch user role from database
  const dbUser = await db.query.user.findFirst({
    where: eq(user.id, currentUser.id),
    columns: { roleId: true },
  })

  // Only admins can see all units (including inactive)
  if (dbUser?.roleId !== 'admin') {
    return getUnits()
  }

  try {
    const data = await db.select().from(units).orderBy(asc(units.name))
    return { success: true, data }
  } catch {
    return { error: 'Failed to fetch units' }
  }
}

export async function createUnit(data: { name: string; displayName?: string }) {
  const currentUser = await getCurrentUser()
  if (!currentUser) return { error: 'Not authenticated' }

  // Fetch user role from database
  const dbUser = await db.query.user.findFirst({
    where: eq(user.id, currentUser.id),
    columns: { roleId: true },
  })

  if (dbUser?.roleId !== 'admin') {
    return { error: 'Unauthorized: Only admins can manage units' }
  }

  try {
    const [newItem] = await db
      .insert(units)
      .values({
        name: data.name.toLowerCase().trim(),
        displayName: data.displayName?.trim() || null,
      })
      .returning()
    revalidatePath('/settings')
    return { success: true, data: newItem }
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === '23505') {
      // Unique constraint violation
      return { error: 'Unit with this name already exists' }
    }
    return { error: 'Failed to create unit' }
  }
}

export async function updateUnit(id: string, data: Partial<typeof units.$inferInsert>) {
  const currentUser = await getCurrentUser()
  if (!currentUser) return { error: 'Not authenticated' }

  // Fetch user role from database
  const dbUser = await db.query.user.findFirst({
    where: eq(user.id, currentUser.id),
    columns: { roleId: true },
  })

  if (dbUser?.roleId !== 'admin') {
    return { error: 'Unauthorized: Only admins can manage units' }
  }

  try {
    await db
      .update(units)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(units.id, id))
    revalidatePath('/settings')
    return { success: true }
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === '23505') {
      return { error: 'Unit with this name already exists' }
    }
    return { error: 'Failed to update unit' }
  }
}

export async function deleteUnit(id: string) {
  const currentUser = await getCurrentUser()
  if (!currentUser) return { error: 'Not authenticated' }

  // Fetch user role from database
  const dbUser = await db.query.user.findFirst({
    where: eq(user.id, currentUser.id),
    columns: { roleId: true },
  })

  if (dbUser?.roleId !== 'admin') {
    return { error: 'Unauthorized: Only admins can manage units' }
  }

  try {
    await db.delete(units).where(eq(units.id, id))
    revalidatePath('/settings')
    return { success: true }
  } catch {
    return { error: 'Failed to delete unit' }
  }
}
