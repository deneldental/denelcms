'use server'

import { db } from '@/lib/db'
import { orthoConsentForms, patients } from '@/lib/db/schema'
import { eq, and, or, like } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { checkPermission, getCurrentUser } from '@/lib/rbac'
import { MODULES, ACTIONS } from '@/lib/modules'
import { logError } from '@/lib/logger'
import { createAuditLog } from '@/lib/audit'

const MODULE = MODULES.PATIENTS // Consent forms are part of patient management

/**
 * Get all ortho consent forms
 */
export async function getOrthoConsentForms(searchTerm?: string) {
  const currentUser = await getCurrentUser()
  if (!currentUser) return { error: 'Not authenticated' }

  if (!(await checkPermission(currentUser.id, MODULE, ACTIONS.READ))) {
    return { error: 'Unauthorized' }
  }

  try {
    // Get all ortho patients with their consent form status
    // Build where conditions
    const whereConditions = searchTerm
      ? and(
          eq(patients.isOrtho, true),
          or(
            like(patients.name, `%${searchTerm}%`),
            like(patients.patientId, `%${searchTerm}%`),
            like(patients.phone, `%${searchTerm}%`)
          )
        )
      : eq(patients.isOrtho, true)

    const results = await db
      .select({
        patient: patients,
        consentForm: orthoConsentForms,
      })
      .from(patients)
      .leftJoin(orthoConsentForms, eq(patients.id, orthoConsentForms.patientId))
      .where(whereConditions)

    // Transform results to include consent form status
    const data = results.map((row) => ({
      id: row.patient.id,
      patientId: row.patient.patientId,
      name: row.patient.name,
      phone: row.patient.phone,
      email: row.patient.email,
      profileImage: row.patient.profileImage,
      consentFormId: row.consentForm?.id ?? null,
      consentFormUrl: row.consentForm?.consentFormUrl ?? null,
      status: row.consentForm?.status || 'unsigned',
      uploadedAt: row.consentForm?.uploadedAt ?? null,
      notes: row.consentForm?.notes ?? null,
      createdAt: row.patient.createdAt,
    }))

    return { success: true, data }
  } catch (error) {
    logError(error, { userId: currentUser.id, action: 'get_ortho_consent_forms' })
    return { error: 'Failed to fetch ortho consent forms' }
  }
}

/**
 * Upload consent form for a patient
 */
export async function uploadConsentForm(data: {
  patientId: string
  consentFormUrl: string
  notes?: string
}) {
  const currentUser = await getCurrentUser()
  if (!currentUser) return { error: 'Not authenticated' }

  if (!(await checkPermission(currentUser.id, MODULE, ACTIONS.UPDATE))) {
    return { error: 'Unauthorized' }
  }

  try {
    // Check if patient exists and is ortho
    const patient = await db.query.patients.findFirst({
      where: eq(patients.id, data.patientId),
    })

    if (!patient) {
      return { error: 'Patient not found' }
    }

    if (!patient.isOrtho) {
      return { error: 'Patient is not an ortho patient' }
    }

    // Check if consent form already exists
    const existingForm = await db.query.orthoConsentForms.findFirst({
      where: eq(orthoConsentForms.patientId, data.patientId),
    })

    if (existingForm) {
      // Update existing form
      await db
        .update(orthoConsentForms)
        .set({
          consentFormUrl: data.consentFormUrl,
          status: 'signed',
          uploadedById: currentUser.id,
          uploadedAt: new Date(),
          notes: data.notes || null,
          updatedAt: new Date(),
        })
        .where(eq(orthoConsentForms.id, existingForm.id))
    } else {
      // Create new form
      await db.insert(orthoConsentForms).values({
        patientId: data.patientId,
        consentFormUrl: data.consentFormUrl,
        status: 'signed',
        uploadedById: currentUser.id,
        uploadedAt: new Date(),
        notes: data.notes || null,
      })
    }

    // Create audit log
    await createAuditLog({
      userId: currentUser.id,
      action: 'upload',
      module: 'ortho_consent_forms',
      entityId: data.patientId,
      entityName: patient.name,
      changes: {
        status: { before: existingForm?.status || 'unsigned', after: 'signed' },
        uploadedAt: { before: null, after: new Date() },
      },
    })

    revalidatePath('/ortho-consent')
    return { success: true }
  } catch (error) {
    logError(error, { userId: currentUser.id, action: 'upload_consent_form', data })
    return { error: 'Failed to upload consent form' }
  }
}

/**
 * Delete consent form
 */
export async function deleteConsentForm(patientId: string) {
  const currentUser = await getCurrentUser()
  if (!currentUser) return { error: 'Not authenticated' }

  if (!(await checkPermission(currentUser.id, MODULE, ACTIONS.DELETE))) {
    return { error: 'Unauthorized' }
  }

  try {
    const patient = await db.query.patients.findFirst({
      where: eq(patients.id, patientId),
    })

    if (!patient) {
      return { error: 'Patient not found' }
    }

    // Update status to unsigned instead of deleting
    await db
      .update(orthoConsentForms)
      .set({
        status: 'unsigned',
        consentFormUrl: null,
        notes: null,
        updatedAt: new Date(),
      })
      .where(eq(orthoConsentForms.patientId, patientId))

    // Create audit log
    await createAuditLog({
      userId: currentUser.id,
      action: 'delete',
      module: 'ortho_consent_forms',
      entityId: patientId,
      entityName: patient.name,
      changes: {
        status: { before: 'signed', after: 'unsigned' },
      },
    })

    revalidatePath('/ortho-consent')
    return { success: true }
  } catch (error) {
    logError(error, { userId: currentUser.id, action: 'delete_consent_form', patientId })
    return { error: 'Failed to delete consent form' }
  }
}
