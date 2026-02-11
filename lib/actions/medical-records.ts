'use server'

import { db } from '@/lib/db'
import { medicalRecords, pendingMedicalRecords, doctors } from '@/lib/db/schema'
import { eq, and, desc } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { getCurrentUser, isDoctorOrAdmin } from '@/lib/rbac'

export async function getMedicalRecords() {
  const currentUser = await getCurrentUser()
  if (!currentUser) return { error: 'Not authenticated' }

  // Only doctors and admins can read medical records
  if (!(await isDoctorOrAdmin(currentUser.id))) {
    return { error: 'Unauthorized: Only doctors and admins can view medical records' }
  }

  try {
    const data = await db.query.medicalRecords.findMany({
      with: { patient: true, doctor: { with: { user: true } } },
    })
    return { success: true, data }
  } catch {
    return { error: 'Failed to fetch medical records' }
  }
}

export async function getMedicalRecord(id: string) {
  const currentUser = await getCurrentUser()
  if (!currentUser) return { error: 'Not authenticated' }

  // Only doctors and admins can read medical records
  if (!(await isDoctorOrAdmin(currentUser.id))) {
    return { error: 'Unauthorized: Only doctors and admins can view medical records' }
  }

  try {
    const [data] = await db.select().from(medicalRecords).where(eq(medicalRecords.id, id)).limit(1)
    if (!data) {
      return { error: 'Medical record not found' }
    }

    // Fetch related data
    const recordWithRelations = await db.query.medicalRecords.findFirst({
      where: eq(medicalRecords.id, id),
      with: { patient: true, doctor: { with: { user: true } } },
    })

    if (!recordWithRelations) {
      return { error: 'Medical record not found' }
    }

    return { success: true, data: recordWithRelations }
  } catch (error) {
    console.error('Error fetching medical record:', error)
    return { error: error instanceof Error ? error.message : 'Failed to fetch medical record' }
  }
}

export async function getMedicalRecordsByPatientId(patientId: string) {
  const currentUser = await getCurrentUser()
  if (!currentUser) return { error: 'Not authenticated' }

  // Only doctors and admins can read medical records
  if (!(await isDoctorOrAdmin(currentUser.id))) {
    return { error: 'Unauthorized: Only doctors and admins can view medical records' }
  }

  try {
    const data = await db.query.medicalRecords.findMany({
      where: eq(medicalRecords.patientId, patientId),
      with: { patient: true, doctor: { with: { user: true } } },
    })
    return { success: true, data }
  } catch {
    return { error: 'Failed to fetch medical records' }
  }
}

export async function createMedicalRecord(data: typeof medicalRecords.$inferInsert) {
  const currentUser = await getCurrentUser()
  if (!currentUser) return { error: 'Not authenticated' }

  // Only doctors and admins can create medical records
  if (!(await isDoctorOrAdmin(currentUser.id))) {
    return { error: 'Unauthorized: Only doctors and admins can create medical records' }
  }

  try {
    const [newItem] = await db.insert(medicalRecords).values(data).returning()

    // Mark any pending medical record for this patient and doctor as completed
    if (data.patientId && data.doctorId) {
      await db
        .update(pendingMedicalRecords)
        .set({
          status: 'completed',
          completedAt: new Date(),
        })
        .where(
          and(
            eq(pendingMedicalRecords.patientId, data.patientId),
            eq(pendingMedicalRecords.doctorId, data.doctorId),
            eq(pendingMedicalRecords.status, 'pending')
          )
        )
    }

    revalidatePath('/medical-records')
    return { success: true, data: newItem }
  } catch {
    return { error: 'Failed to create medical record' }
  }
}

export async function updateMedicalRecord(
  id: string,
  data: Partial<typeof medicalRecords.$inferInsert>
) {
  const currentUser = await getCurrentUser()
  if (!currentUser) return { error: 'Not authenticated' }

  // Only doctors and admins can update medical records
  if (!(await isDoctorOrAdmin(currentUser.id))) {
    return { error: 'Unauthorized: Only doctors and admins can update medical records' }
  }

  try {
    await db.update(medicalRecords).set(data).where(eq(medicalRecords.id, id))
    revalidatePath('/medical-records')
    revalidatePath(`/medical-records/${id}`)
    return { success: true }
  } catch {
    return { error: 'Failed to update medical record' }
  }
}

export async function deleteMedicalRecord(id: string) {
  const currentUser = await getCurrentUser()
  if (!currentUser) return { error: 'Not authenticated' }

  // Only doctors and admins can delete medical records
  if (!(await isDoctorOrAdmin(currentUser.id))) {
    return { error: 'Unauthorized: Only doctors and admins can delete medical records' }
  }

  try {
    await db.delete(medicalRecords).where(eq(medicalRecords.id, id))
    revalidatePath('/medical-records')
    return { success: true }
  } catch {
    return { error: 'Failed to delete medical record' }
  }
}

// Pending Medical Records Actions
export async function createPendingMedicalRecord(data: {
  patientId: string
  doctorId: string
  appointmentId: string
}) {
  try {
    const [record] = await db
      .insert(pendingMedicalRecords)
      .values({
        patientId: data.patientId,
        doctorId: data.doctorId,
        appointmentId: data.appointmentId,
        status: 'pending',
      })
      .returning()

    revalidatePath('/medical-records')
    return { success: true, data: record }
  } catch (error) {
    console.error('Error creating pending medical record:', error)
    return { error: 'Failed to create pending medical record' }
  }
}

export async function getPendingMedicalRecords(doctorId?: string) {
  const currentUser = await getCurrentUser()
  if (!currentUser) return { error: 'Not authenticated' }

  // Only doctors and admins can view pending medical records
  if (!(await isDoctorOrAdmin(currentUser.id))) {
    return { error: 'Unauthorized: Only doctors and admins can view pending medical records' }
  }

  try {
    // If user is a doctor, get their doctor ID
    let targetDoctorId = doctorId
    if (!targetDoctorId) {
      const doctorRecord = await db.query.doctors.findFirst({
        where: eq(doctors.userId, currentUser.id),
        columns: { id: true },
      })

      if (doctorRecord) {
        targetDoctorId = doctorRecord.id
      }
    }

    // Fetch pending records with relations
    const data = await db.query.pendingMedicalRecords.findMany({
      where: targetDoctorId
        ? and(
            eq(pendingMedicalRecords.status, 'pending'),
            eq(pendingMedicalRecords.doctorId, targetDoctorId)
          )
        : eq(pendingMedicalRecords.status, 'pending'),
      with: {
        patient: true,
        doctor: { with: { user: true } },
        appointment: true,
      },
      orderBy: (pendingMedicalRecords) => [desc(pendingMedicalRecords.checkedInAt)],
    })

    return { success: true, data }
  } catch (error: unknown) {
    // Check if the error is about the table not existing
    const errorMessage = error instanceof Error ? error.message : String(error)
    interface ErrorWithCause {
      cause?: {
        code?: string
      }
    }

    const errorCode = (error as ErrorWithCause)?.cause?.code

    if (errorCode === '42P01' || errorMessage.includes('does not exist')) {
      console.error('Pending medical records table does not exist. Please run migrations.')
      // Return empty array instead of error so the page still loads
      return { success: true, data: [] }
    }
    console.error('Error fetching pending medical records:', error)
    return { error: 'Failed to fetch pending medical records' }
  }
}

export async function completePendingMedicalRecord(id: string) {
  const currentUser = await getCurrentUser()
  if (!currentUser) return { error: 'Not authenticated' }

  if (!(await isDoctorOrAdmin(currentUser.id))) {
    return { error: 'Unauthorized' }
  }

  try {
    await db
      .update(pendingMedicalRecords)
      .set({
        status: 'completed',
        completedAt: new Date(),
      })
      .where(eq(pendingMedicalRecords.id, id))

    revalidatePath('/medical-records')
    return { success: true }
  } catch (error) {
    console.error('Error completing pending medical record:', error)
    return { error: 'Failed to complete pending medical record' }
  }
}
