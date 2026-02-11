'use server'

import { db } from '@/lib/db'
import { doctorUnavailability } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { checkPermission, getCurrentUser } from '@/lib/rbac'
import { MODULES, ACTIONS } from '@/lib/modules'

const MODULE = MODULES.APPOINTMENTS // Managing unavailability is part of appointments/scheduling

export async function getDoctorUnavailability(doctorId?: string) {
  const currentUser = await getCurrentUser()
  if (!currentUser) return { error: 'Not authenticated' }

  if (!(await checkPermission(currentUser.id, MODULE, ACTIONS.READ)))
    return { error: 'Unauthorized' }

  try {
    const whereClause = doctorId ? eq(doctorUnavailability.doctorId, doctorId) : undefined
    const data = await db.query.doctorUnavailability.findMany({
      where: whereClause,
      with: { doctor: { with: { user: true } } },
    })
    return { success: true, data }
  } catch {
    return { error: 'Failed to fetch unavailability' }
  }
}

export async function createUnavailability(data: typeof doctorUnavailability.$inferInsert) {
  const currentUser = await getCurrentUser()
  if (!currentUser) return { error: 'Not authenticated' }

  if (!(await checkPermission(currentUser.id, MODULE, ACTIONS.CREATE)))
    return { error: 'Unauthorized' }

  try {
    const [newItem] = await db.insert(doctorUnavailability).values(data).returning()
    revalidatePath('/appointments')
    return { success: true, data: newItem }
  } catch {
    return { error: 'Failed to create unavailability' }
  }
}

export async function deleteUnavailability(id: string) {
  const currentUser = await getCurrentUser()
  if (!currentUser) return { error: 'Not authenticated' }

  if (!(await checkPermission(currentUser.id, MODULE, ACTIONS.DELETE)))
    return { error: 'Unauthorized' }

  try {
    await db.delete(doctorUnavailability).where(eq(doctorUnavailability.id, id))
    revalidatePath('/appointments')
    return { success: true }
  } catch {
    return { error: 'Failed to delete unavailability' }
  }
}
