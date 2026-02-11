'use server'

import { db } from '@/lib/db'
import { patients, user } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { checkPermission, getCurrentUser } from '@/lib/rbac'
import { MODULES, ACTIONS } from '@/lib/modules'
import { logError, logger } from '@/lib/logger'

export async function getPatients() {
  const currentUser = await getCurrentUser()
  if (!currentUser) return { error: 'Not authenticated' }

  const hasPermission = await checkPermission(currentUser.id, MODULES.PATIENTS, ACTIONS.READ)
  if (!hasPermission) return { error: 'Unauthorized' }

  try {
    const data = await db.query.patients.findMany()
    return { success: true, data }
  } catch {
    return { error: 'Failed to fetch patients' }
  }
}

export async function getPatient(id: string) {
  const currentUser = await getCurrentUser()
  if (!currentUser) return { error: 'Not authenticated' }

  const hasPermission = await checkPermission(currentUser.id, MODULES.PATIENTS, ACTIONS.READ)
  if (!hasPermission) return { error: 'Unauthorized' }

  try {
    const data = await db.query.patients.findFirst({
      where: eq(patients.id, id),
    })

    if (!data) {
      return { error: 'Patient not found' }
    }

    return { success: true, data }
  } catch {
    return { error: 'Failed to fetch patient' }
  }
}

export async function createPatient(data: typeof patients.$inferInsert) {
  const currentUser = await getCurrentUser()
  if (!currentUser) return { error: 'Not authenticated' }

  const hasPermission = await checkPermission(currentUser.id, MODULES.PATIENTS, ACTIONS.CREATE)
  if (!hasPermission) {
    // Get user details for better error message
    const dbUser = await db.query.user.findFirst({
      where: eq(user.id, currentUser.id),
      with: {
        role: true,
      },
    })

    if (!dbUser?.role) {
      return {
        error: 'Unauthorized: No role assigned to your account. Please contact an administrator.',
      }
    }

    return {
      error: `Unauthorized: Your role (${dbUser.role.name || dbUser.role.id}) does not have permission to create patients.`,
    }
  }

  try {
    // Use database sequence to generate unique Patient ID (prevents race conditions)
    const patientData = await db.transaction(async (tx) => {
      // Get next ID from sequence
      const result = await tx.execute<{ nextval: number }>("SELECT nextval('patient_id_seq')")
      interface RowResult {
        nextval: number
      }
      const nextval = (result.rows[0] as RowResult).nextval

      const patientId = `#FDM${String(nextval).padStart(6, '0')}`

      // Ensure boolean fields are set
      const insertData = {
        ...data,
        patientId,
        type: data.type || 'general',
        isChild: data.isChild ?? false,
        isOrtho: data.isOrtho ?? false,
      }

      const [newPatient] = await tx.insert(patients).values(insertData).returning()
      return newPatient
    })

    logger.info({ patientId: patientData.id, name: patientData.name }, 'Patient created')
    revalidatePath('/patients')
    return { success: true, data: patientData }
  } catch (error) {
    logError(error, { userId: currentUser.id })
    return { error: error instanceof Error ? error.message : 'Failed to create patient' }
  }
}

export async function updatePatient(id: string, data: Partial<typeof patients.$inferInsert>) {
  const currentUser = await getCurrentUser()
  if (!currentUser) return { error: 'Not authenticated' }

  const hasPermission = await checkPermission(currentUser.id, MODULES.PATIENTS, ACTIONS.UPDATE)
  if (!hasPermission) return { error: 'Unauthorized' }

  try {
    await db.update(patients).set(data).where(eq(patients.id, id))
    revalidatePath('/patients')
    revalidatePath(`/patients/${id}`)
    return { success: true }
  } catch {
    return { error: 'Failed to update patient' }
  }
}

export async function deletePatient(id: string) {
  const currentUser = await getCurrentUser()
  if (!currentUser) return { error: 'Not authenticated' }

  const hasPermission = await checkPermission(currentUser.id, MODULES.PATIENTS, ACTIONS.DELETE)
  if (!hasPermission) return { error: 'Unauthorized' }

  try {
    await db.delete(patients).where(eq(patients.id, id))
    revalidatePath('/patients')
    return { success: true }
  } catch {
    return { error: 'Failed to delete patient' }
  }
}

export async function importPatientsFromCSV(csvData: Array<Record<string, string>>) {
  const currentUser = await getCurrentUser()
  if (!currentUser) return { error: 'Not authenticated' }

  const hasPermission = await checkPermission(currentUser.id, MODULES.PATIENTS, ACTIONS.CREATE)
  if (!hasPermission) return { error: 'Unauthorized' }

  const results = {
    success: 0,
    failed: 0,
    errors: [] as Array<{ row: number; error: string }>,
  }

  try {
    // Get the last patient ID to continue numbering
    const lastPatient = await db.query.patients.findFirst({
      orderBy: (patients, { desc }) => [desc(patients.createdAt)],
    })

    let nextId = 1
    if (lastPatient?.patientId) {
      const lastIdMatch = lastPatient.patientId.match(/FDM(\d+)/)
      if (lastIdMatch) {
        nextId = parseInt(lastIdMatch[1]) + 1
      }
    }

    for (let i = 0; i < csvData.length; i++) {
      const row = csvData[i]
      const rowNumber = i + 2 // +2 because row 1 is header, and arrays are 0-indexed

      try {
        // Validate required fields
        if (!row.name || row.name.trim() === '') {
          results.errors.push({ row: rowNumber, error: 'Name is required' })
          results.failed++
          continue
        }

        if (!row.dob || row.dob.trim() === '') {
          results.errors.push({ row: rowNumber, error: 'Date of birth is required' })
          results.failed++
          continue
        }

        if (!row.gender || row.gender.trim() === '') {
          results.errors.push({ row: rowNumber, error: 'Gender is required' })
          results.failed++
          continue
        }

        // Parse date
        const dob = new Date(row.dob)
        if (isNaN(dob.getTime())) {
          results.errors.push({ row: rowNumber, error: 'Invalid date format for DOB' })
          results.failed++
          continue
        }

        // Parse boolean fields
        const isChild = row.isChild?.toLowerCase() === 'true' || row.isChild === '1'
        const isOrtho = row.isOrtho?.toLowerCase() === 'true' || row.isOrtho === '1'
        const type = row.type?.toLowerCase() || 'general'

        // Validate type
        if (!['general', 'ortho', 'external', 'legacy'].includes(type)) {
          results.errors.push({
            row: rowNumber,
            error: "Invalid type. Must be 'general', 'ortho', 'external', or 'legacy'",
          })
          results.failed++
          continue
        }

        // Validate gender
        if (!['male', 'female'].includes(row.gender.toLowerCase())) {
          results.errors.push({
            row: rowNumber,
            error: "Invalid gender. Must be 'male' or 'female'",
          })
          results.failed++
          continue
        }

        // For child patients, validate guardian fields
        if (isChild) {
          if (!row.guardianName || row.guardianName.trim() === '') {
            results.errors.push({
              row: rowNumber,
              error: 'Guardian name is required for child patients',
            })
            results.failed++
            continue
          }
          if (!row.guardianPhone || row.guardianPhone.trim() === '') {
            results.errors.push({
              row: rowNumber,
              error: 'Guardian phone is required for child patients',
            })
            results.failed++
            continue
          }
          if (!row.guardianAddress || row.guardianAddress.trim() === '') {
            results.errors.push({
              row: rowNumber,
              error: 'Guardian address is required for child patients',
            })
            results.failed++
            continue
          }
          if (!row.guardianOccupation || row.guardianOccupation.trim() === '') {
            results.errors.push({
              row: rowNumber,
              error: 'Guardian occupation is required for child patients',
            })
            results.failed++
            continue
          }
        } else {
          // For adult patients, validate required fields
          if (!row.address || row.address.trim() === '') {
            results.errors.push({ row: rowNumber, error: 'Address is required for adult patients' })
            results.failed++
            continue
          }
          if (!row.occupation || row.occupation.trim() === '') {
            results.errors.push({
              row: rowNumber,
              error: 'Occupation is required for adult patients',
            })
            results.failed++
            continue
          }
          if (!row.phone || row.phone.trim() === '') {
            results.errors.push({ row: rowNumber, error: 'Phone is required for adult patients' })
            results.failed++
            continue
          }
        }

        // Prepare patient data
        const patientData: typeof patients.$inferInsert = {
          name: row.name.trim(),
          email: row.email?.trim() || undefined,
          phone: isChild ? undefined : row.phone?.trim(),
          dob,
          gender: row.gender.toLowerCase(),
          address: isChild ? undefined : row.address?.trim(),
          occupation: isChild ? undefined : row.occupation?.trim(),
          type: type as 'general' | 'external' | 'legacy',
          isChild,
          isOrtho: isOrtho || type === 'ortho',
          // Guardian fields
          guardianName: isChild ? row.guardianName?.trim() : undefined,
          guardianPhone: isChild ? row.guardianPhone?.trim() : undefined,
          guardianEmail: isChild ? row.guardianEmail?.trim() : undefined,
          guardianAddress: isChild ? row.guardianAddress?.trim() : undefined,
          guardianOccupation: isChild ? row.guardianOccupation?.trim() : undefined,
          // Insurance fields
          insuranceProvider: row.insuranceProvider?.trim() || undefined,
          insurancePolicyNumber: row.insurancePolicyNumber?.trim() || undefined,
          // Emergency contact
          emergencyContactName: row.emergencyContactName?.trim() || undefined,
          emergencyContactPhone: row.emergencyContactPhone?.trim() || undefined,
        }

        // Generate patient ID
        const patientId = `#FDM${nextId.toString().padStart(6, '0')}`
        patientData.patientId = patientId
        nextId++

        // Insert patient
        await db.insert(patients).values(patientData)
        results.success++
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to create patient'
        results.errors.push({
          row: rowNumber,
          error: errorMessage,
        })
        results.failed++
      }
    }

    revalidatePath('/patients')
    return { success: true, data: results }
  } catch (error) {
    console.error('Error importing patients:', error)
    return { error: 'Failed to import patients' }
  }
}
