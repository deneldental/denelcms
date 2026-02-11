'use server'

import { db } from '@/lib/db'
import { treatmentTypes, user } from '@/lib/db/schema'
import { eq, asc } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { getCurrentUser } from '@/lib/rbac'

export async function getTreatmentTypes() {
  const currentUser = await getCurrentUser()
  if (!currentUser) return { error: 'Not authenticated' }

  try {
    const data = await db
      .select()
      .from(treatmentTypes)
      .where(eq(treatmentTypes.isActive, true))
      .orderBy(asc(treatmentTypes.name))
    return { success: true, data }
  } catch (error) {
    console.error('Error fetching treatment types:', error)
    return { error: `Failed to fetch treatment types: ${error instanceof Error ? error.message : String(error)}` }
  }
}

export async function getAllTreatmentTypes() {
  const currentUser = await getCurrentUser()
  if (!currentUser) return { error: 'Not authenticated' }

  // Fetch user role from database
  const dbUser = await db.query.user.findFirst({
    where: eq(user.id, currentUser.id),
    columns: { roleId: true },
  })

  // Only admins can see all treatment types (including inactive)
  if (dbUser?.roleId !== 'admin') {
    return getTreatmentTypes()
  }

  try {
    const data = await db.select().from(treatmentTypes).orderBy(asc(treatmentTypes.name))
    return { success: true, data }
  } catch (error) {
    console.error('Error fetching all treatment types:', error)
    return { error: `Failed to fetch treatment types: ${error instanceof Error ? error.message : String(error)}` }
  }
}

export async function createTreatmentType(data: { name: string; displayName?: string }) {
  const currentUser = await getCurrentUser()
  if (!currentUser) return { error: 'Not authenticated' }

  // Fetch user role from database
  const dbUser = await db.query.user.findFirst({
    where: eq(user.id, currentUser.id),
    columns: { roleId: true },
  })

  if (dbUser?.roleId !== 'admin') {
    return { error: 'Unauthorized: Only admins can manage treatment types' }
  }

  try {
    const [newItem] = await db
      .insert(treatmentTypes)
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
      return { error: 'Treatment type with this name already exists' }
    }
    return { error: 'Failed to create treatment type' }
  }
}

export async function updateTreatmentType(
  id: string,
  data: Partial<typeof treatmentTypes.$inferInsert>
) {
  const currentUser = await getCurrentUser()
  if (!currentUser) return { error: 'Not authenticated' }

  // Fetch user role from database
  const dbUser = await db.query.user.findFirst({
    where: eq(user.id, currentUser.id),
    columns: { roleId: true },
  })

  if (dbUser?.roleId !== 'admin') {
    return { error: 'Unauthorized: Only admins can manage treatment types' }
  }

  try {
    await db
      .update(treatmentTypes)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(treatmentTypes.id, id))
    revalidatePath('/settings')
    return { success: true }
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === '23505') {
      return { error: 'Treatment type with this name already exists' }
    }
    return { error: 'Failed to update treatment type' }
  }
}

export async function deleteTreatmentType(id: string) {
  const currentUser = await getCurrentUser()
  if (!currentUser) return { error: 'Not authenticated' }

  // Fetch user role from database
  const dbUser = await db.query.user.findFirst({
    where: eq(user.id, currentUser.id),
    columns: { roleId: true },
  })

  if (dbUser?.roleId !== 'admin') {
    return { error: 'Unauthorized: Only admins can manage treatment types' }
  }

  try {
    await db.delete(treatmentTypes).where(eq(treatmentTypes.id, id))
    revalidatePath('/settings')
    return { success: true }
  } catch {
    return { error: 'Failed to delete treatment type' }
  }
}
