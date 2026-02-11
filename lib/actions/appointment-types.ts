'use server'

import { db } from '@/lib/db'
import { appointmentTypes, user } from '@/lib/db/schema'
import { eq, asc } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { getCurrentUser } from '@/lib/rbac'

export async function getAppointmentTypes() {
  const currentUser = await getCurrentUser()
  if (!currentUser) return { error: 'Not authenticated' }

  try {
    const data = await db
      .select()
      .from(appointmentTypes)
      .where(eq(appointmentTypes.isActive, true))
      .orderBy(appointmentTypes.name)
    return { success: true, data }
  } catch (error) {
    console.error('Error fetching appointment types:', error)
    return { error: `Failed to fetch appointment types: ${error instanceof Error ? error.message : String(error)}` }
  }
}

export async function getAllAppointmentTypes() {
  const currentUser = await getCurrentUser()
  if (!currentUser) return { error: 'Not authenticated' }

  // Fetch user role from database
  const dbUser = await db.query.user.findFirst({
    where: eq(user.id, currentUser.id),
    columns: { roleId: true },
  })

  // Only admins can see all appointment types (including inactive)
  if (dbUser?.roleId !== 'admin') {
    return getAppointmentTypes()
  }

  try {
    const data = await db.select().from(appointmentTypes).orderBy(asc(appointmentTypes.name))
    return { success: true, data }
  } catch (error) {
    console.error('Error fetching all appointment types:', error)
    return { error: `Failed to fetch appointment types: ${error instanceof Error ? error.message : String(error)}` }
  }
}

export async function createAppointmentType(data: { name: string; displayName?: string }) {
  const currentUser = await getCurrentUser()
  if (!currentUser) return { error: 'Not authenticated' }

  // Fetch user role from database
  const dbUser = await db.query.user.findFirst({
    where: eq(user.id, currentUser.id),
    columns: { roleId: true },
  })

  if (dbUser?.roleId !== 'admin') {
    return { error: 'Unauthorized: Only admins can manage appointment types' }
  }

  try {
    const [newItem] = await db
      .insert(appointmentTypes)
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
      return { error: 'Appointment type with this name already exists' }
    }
    return { error: 'Failed to create appointment type' }
  }
}

export async function updateAppointmentType(
  id: string,
  data: Partial<typeof appointmentTypes.$inferInsert>
) {
  const currentUser = await getCurrentUser()
  if (!currentUser) return { error: 'Not authenticated' }

  // Fetch user role from database
  const dbUser = await db.query.user.findFirst({
    where: eq(user.id, currentUser.id),
    columns: { roleId: true },
  })

  if (dbUser?.roleId !== 'admin') {
    return { error: 'Unauthorized: Only admins can manage appointment types' }
  }

  try {
    await db
      .update(appointmentTypes)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(appointmentTypes.id, id))
    revalidatePath('/settings')
    return { success: true }
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === '23505') {
      return { error: 'Appointment type with this name already exists' }
    }
    return { error: 'Failed to update appointment type' }
  }
}

export async function deleteAppointmentType(id: string) {
  const currentUser = await getCurrentUser()
  if (!currentUser) return { error: 'Not authenticated' }

  // Fetch user role from database
  const dbUser = await db.query.user.findFirst({
    where: eq(user.id, currentUser.id),
    columns: { roleId: true },
  })

  if (dbUser?.roleId !== 'admin') {
    return { error: 'Unauthorized: Only admins can manage appointment types' }
  }

  try {
    await db.delete(appointmentTypes).where(eq(appointmentTypes.id, id))
    revalidatePath('/settings')
    return { success: true }
  } catch {
    return { error: 'Failed to delete appointment type' }
  }
}
