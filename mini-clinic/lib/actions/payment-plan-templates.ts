'use server'

import { db } from '@/lib/db'
import { paymentPlanTemplates } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { checkPermission, getCurrentUser } from '@/lib/rbac'
import { MODULES, ACTIONS } from '@/lib/modules'

export async function getPaymentPlanTemplates() {
  const currentUser = await getCurrentUser()
  if (!currentUser) return { error: 'Not authenticated' }

  const hasPermission = await checkPermission(currentUser.id, MODULES.PATIENTS, ACTIONS.READ)
  if (!hasPermission) return { error: 'Unauthorized' }

  try {
    const data = await db.query.paymentPlanTemplates.findMany({
      orderBy: (templates, { desc, asc }) => [desc(templates.isDefault), asc(templates.name)],
    })

    return { success: true, data }
  } catch (error) {
    console.error('Error fetching payment plan templates:', error)
    return { error: 'Failed to fetch payment plan templates' }
  }
}

export async function getPaymentPlanTemplate(id: string) {
  const currentUser = await getCurrentUser()
  if (!currentUser) return { error: 'Not authenticated' }

  const hasPermission = await checkPermission(currentUser.id, MODULES.PATIENTS, ACTIONS.READ)
  if (!hasPermission) return { error: 'Unauthorized' }

  try {
    const data = await db.query.paymentPlanTemplates.findFirst({
      where: eq(paymentPlanTemplates.id, id),
    })

    if (!data) {
      return { error: 'Payment plan template not found' }
    }

    return { success: true, data }
  } catch (error) {
    console.error('Error fetching payment plan template:', error)
    return { error: 'Failed to fetch payment plan template' }
  }
}

export async function getDefaultPaymentPlanTemplate() {
  const currentUser = await getCurrentUser()
  if (!currentUser) return { error: 'Not authenticated' }

  const hasPermission = await checkPermission(currentUser.id, MODULES.PATIENTS, ACTIONS.READ)
  if (!hasPermission) return { error: 'Unauthorized' }

  try {
    const data = await db.query.paymentPlanTemplates.findFirst({
      where: eq(paymentPlanTemplates.isDefault, true),
    })

    return { success: true, data: data || null }
  } catch (error) {
    console.error('Error fetching default payment plan template:', error)
    return { error: 'Failed to fetch default payment plan template' }
  }
}

export async function createPaymentPlanTemplate(data: typeof paymentPlanTemplates.$inferInsert) {
  const currentUser = await getCurrentUser()
  if (!currentUser) return { error: 'Not authenticated' }

  const hasPermission = await checkPermission(currentUser.id, MODULES.PATIENTS, ACTIONS.CREATE)
  if (!hasPermission) return { error: 'Unauthorized' }

  try {
    // If this is set as default, unset other defaults
    if (data.isDefault) {
      await db
        .update(paymentPlanTemplates)
        .set({ isDefault: false })
        .where(eq(paymentPlanTemplates.isDefault, true))
    }

    const [newTemplate] = await db.insert(paymentPlanTemplates).values(data).returning()
    revalidatePath('/settings')
    return { success: true, data: newTemplate }
  } catch (error) {
    console.error('Error creating payment plan template:', error)
    return { error: 'Failed to create payment plan template' }
  }
}

export async function updatePaymentPlanTemplate(
  id: string,
  data: Partial<typeof paymentPlanTemplates.$inferInsert>
) {
  const currentUser = await getCurrentUser()
  if (!currentUser) return { error: 'Not authenticated' }

  const hasPermission = await checkPermission(currentUser.id, MODULES.PATIENTS, ACTIONS.UPDATE)
  if (!hasPermission) return { error: 'Unauthorized' }

  try {
    // If this is set as default, unset all other defaults first
    if (data.isDefault === true) {
      // Get all templates that are currently default (except this one)
      const currentDefaults = await db.query.paymentPlanTemplates.findMany({
        where: eq(paymentPlanTemplates.isDefault, true),
      })

      // Unset defaults for all except the current one
      for (const template of currentDefaults) {
        if (template.id !== id) {
          await db
            .update(paymentPlanTemplates)
            .set({ isDefault: false })
            .where(eq(paymentPlanTemplates.id, template.id))
        }
      }
    }

    const [updated] = await db
      .update(paymentPlanTemplates)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(paymentPlanTemplates.id, id))
      .returning()

    if (!updated) {
      return { error: 'Payment plan template not found' }
    }

    revalidatePath('/settings')
    return { success: true, data: updated }
  } catch (error) {
    console.error('Error updating payment plan template:', error)
    return { error: 'Failed to update payment plan template' }
  }
}

export async function deletePaymentPlanTemplate(id: string) {
  const currentUser = await getCurrentUser()
  if (!currentUser) return { error: 'Not authenticated' }

  const hasPermission = await checkPermission(currentUser.id, MODULES.PATIENTS, ACTIONS.DELETE)
  if (!hasPermission) return { error: 'Unauthorized' }

  try {
    const [deleted] = await db
      .delete(paymentPlanTemplates)
      .where(eq(paymentPlanTemplates.id, id))
      .returning()

    if (!deleted) {
      return { error: 'Payment plan template not found' }
    }

    revalidatePath('/settings')
    return { success: true }
  } catch (error) {
    console.error('Error deleting payment plan template:', error)
    return { error: 'Failed to delete payment plan template' }
  }
}
