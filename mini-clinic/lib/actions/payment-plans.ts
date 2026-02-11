'use server'

import { db } from '@/lib/db'
import { paymentPlans, user, payments } from '@/lib/db/schema'
import { eq, and, sql } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { checkPermission, getCurrentUser } from '@/lib/rbac'
import { MODULES, ACTIONS } from '@/lib/modules'

export async function getPaymentPlanByPatientId(patientId: string) {
  const currentUser = await getCurrentUser()
  if (!currentUser) return { error: 'Not authenticated' }

  const hasPermission = await checkPermission(currentUser.id, MODULES.PATIENTS, ACTIONS.READ)
  if (!hasPermission) return { error: 'Unauthorized' }

  try {
    const data = await db.query.paymentPlans.findFirst({
      where: eq(paymentPlans.patientId, patientId),
    })

    return { success: true, data: data || null }
  } catch (error) {
    console.error('Error fetching payment plan:', error)
    return { error: 'Failed to fetch payment plan' }
  }
}

export async function getAllPaymentPlans() {
  const currentUser = await getCurrentUser()
  if (!currentUser) return { error: 'Not authenticated' }

  const hasPermission = await checkPermission(currentUser.id, MODULES.PATIENTS, ACTIONS.READ)
  if (!hasPermission) return { error: 'Unauthorized' }

  try {
    const data = await db.query.paymentPlans.findMany({
      with: {
        patient: {
          columns: {
            id: true,
            name: true,
            phone: true,
            patientId: true,
          },
        },
      },
      orderBy: (paymentPlans, { desc }) => [desc(paymentPlans.createdAt)],
    })

    return { success: true, data }
  } catch (error) {
    console.error('Error fetching payment plans:', error)
    return { error: 'Failed to fetch payment plans' }
  }
}

export async function createPaymentPlan(data: typeof paymentPlans.$inferInsert) {
  const currentUser = await getCurrentUser()
  if (!currentUser) return { error: 'Not authenticated' }

  const hasPermission = await checkPermission(currentUser.id, MODULES.PATIENTS, ACTIONS.CREATE)
  if (!hasPermission) return { error: 'Unauthorized' }

  try {
    // Check if payment plan already exists for this patient
    const existing = await db.query.paymentPlans.findFirst({
      where: eq(paymentPlans.patientId, data.patientId as string),
    })

    if (existing) {
      return { error: 'Payment plan already exists for this patient' }
    }

    // Determine status based on plan type
    let status = data.status || 'activated'
    if (data.type === 'flexible') {
      status = 'outstanding'
    }

    // Set start date to now if not provided
    const planData = {
      ...data,
      startDate: data.startDate || new Date(),
      status,
      type: data.type || 'fixed',
    }

    const [newPlan] = await db.insert(paymentPlans).values(planData).returning()
    revalidatePath(`/patients/${data.patientId}`)
    revalidatePath('/payments')
    return { success: true, data: newPlan }
  } catch (error) {
    console.error('Error creating payment plan:', error)
    if (error && typeof error === 'object' && 'code' in error && error.code === '23505') {
      // Unique constraint violation
      return { error: 'Payment plan already exists for this patient' }
    }
    return { error: 'Failed to create payment plan' }
  }
}

export async function pausePaymentPlan(id: string) {
  const currentUser = await getCurrentUser()
  if (!currentUser) return { error: 'Not authenticated' }

  const hasPermission = await checkPermission(currentUser.id, MODULES.PATIENTS, ACTIONS.UPDATE)
  if (!hasPermission) return { error: 'Unauthorized' }

  try {
    const [updated] = await db
      .update(paymentPlans)
      .set({ status: 'paused', updatedAt: new Date() })
      .where(eq(paymentPlans.id, id))
      .returning()

    if (!updated) {
      return { error: 'Payment plan not found' }
    }

    revalidatePath(`/patients/${updated.patientId}`)
    return { success: true, data: updated }
  } catch (error) {
    console.error('Error pausing payment plan:', error)
    return { error: 'Failed to pause payment plan' }
  }
}

export async function unpausePaymentPlan(id: string) {
  const currentUser = await getCurrentUser()
  if (!currentUser) return { error: 'Not authenticated' }

  const hasPermission = await checkPermission(currentUser.id, MODULES.PATIENTS, ACTIONS.UPDATE)
  if (!hasPermission) return { error: 'Unauthorized' }

  try {
    const [updated] = await db
      .update(paymentPlans)
      .set({ status: 'activated', updatedAt: new Date() })
      .where(eq(paymentPlans.id, id))
      .returning()

    if (!updated) {
      return { error: 'Payment plan not found' }
    }

    revalidatePath(`/patients/${updated.patientId}`)
    return { success: true, data: updated }
  } catch (error) {
    console.error('Error unpausing payment plan:', error)
    return { error: 'Failed to unpause payment plan' }
  }
}

export async function updatePaymentPlan(
  id: string,
  data: Partial<typeof paymentPlans.$inferInsert>
) {
  const currentUser = await getCurrentUser()
  if (!currentUser) return { error: 'Not authenticated' }

  // Check if user is admin - only admins can change payment plans once they're set
  const dbUser = await db.query.user.findFirst({
    where: eq(user.id, currentUser.id),
    columns: {
      roleId: true,
    },
  })

  if (dbUser?.roleId !== 'admin') {
    return { error: 'Only administrators can change payment plans once they have been selected.' }
  }

  const hasPermission = await checkPermission(currentUser.id, MODULES.PATIENTS, ACTIONS.UPDATE)
  if (!hasPermission) return { error: 'Unauthorized' }

  try {
    const [updated] = await db
      .update(paymentPlans)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(paymentPlans.id, id))
      .returning()

    if (!updated) {
      return { error: 'Payment plan not found' }
    }

    revalidatePath(`/patients/${updated.patientId}`)
    return { success: true, data: updated }
  } catch (error) {
    console.error('Error updating payment plan:', error)
    return { error: 'Failed to update payment plan' }
  }
}

export async function deletePaymentPlan(id: string) {
  const currentUser = await getCurrentUser()
  if (!currentUser) return { error: 'Not authenticated' }

  const hasPermission = await checkPermission(currentUser.id, MODULES.PATIENTS, ACTIONS.DELETE)
  if (!hasPermission) return { error: 'Unauthorized' }

  try {
    const [deleted] = await db.delete(paymentPlans).where(eq(paymentPlans.id, id)).returning()

    if (!deleted) {
      return { error: 'Payment plan not found' }
    }

    revalidatePath(`/patients/${deleted.patientId}`)
    return { success: true }
  } catch (error) {
    console.error('Error deleting payment plan:', error)
    return { error: 'Failed to delete payment plan' }
  }
}

export async function getOverduePaymentPlans() {
  const currentUser = await getCurrentUser()
  if (!currentUser) return { error: 'Not authenticated' }

  const hasPermission = await checkPermission(currentUser.id, MODULES.PATIENTS, ACTIONS.READ)
  if (!hasPermission) return { error: 'Unauthorized' }

  try {
    // Get all fixed plans with their payments
    const plans = await db.query.paymentPlans.findMany({
      where: and(
        eq(paymentPlans.type, 'fixed'),
        sql`${paymentPlans.status} IN ('activated', 'overdue')`
      ),
      with: {
        patient: {
          columns: {
            id: true,
            name: true,
            phone: true,
            patientId: true,
            guardianPhone: true,
            isChild: true,
          },
        },
        payments: {
          where: eq(payments.status, 'completed'),
        },
      },
    })

    // Calculate overdue plans
    const overduePlans = plans.filter((plan) => {
      if (!plan.amountPerInstallment || !plan.paymentFrequency) return false

      const totalPaid = plan.payments.reduce((sum, p) => sum + p.amount, 0)
      const expectedAmount = calculateExpectedAmount(
        plan.startDate,
        plan.amountPerInstallment,
        plan.paymentFrequency
      )

      return expectedAmount > totalPaid
    })

    return { success: true, data: overduePlans }
  } catch (error) {
    console.error('Error fetching overdue payment plans:', error)
    return { error: 'Failed to fetch overdue payment plans' }
  }
}

export async function getOutstandingPaymentPlans() {
  const currentUser = await getCurrentUser()
  if (!currentUser) return { error: 'Not authenticated' }

  const hasPermission = await checkPermission(currentUser.id, MODULES.PATIENTS, ACTIONS.READ)
  if (!hasPermission) return { error: 'Unauthorized' }

  try {
    const plans = await db.query.paymentPlans.findMany({
      where: sql`${paymentPlans.status} IN ('outstanding', 'activated')`,
      with: {
        patient: {
          columns: {
            id: true,
            name: true,
            phone: true,
            patientId: true,
          },
        },
        payments: {
          where: eq(payments.status, 'completed'),
        },
      },
    })

    // Filter to only include plans with outstanding balance
    const outstandingPlans = plans.filter((plan) => {
      const totalPaid = plan.payments.reduce((sum, p) => sum + p.amount, 0)
      return plan.totalAmount > totalPaid
    })

    return { success: true, data: outstandingPlans }
  } catch (error) {
    console.error('Error fetching outstanding payment plans:', error)
    return { error: 'Failed to fetch outstanding payment plans' }
  }
}

export async function getPaymentPlanDetails(id: string) {
  const currentUser = await getCurrentUser()
  if (!currentUser) return { error: 'Not authenticated' }

  const hasPermission = await checkPermission(currentUser.id, MODULES.PATIENTS, ACTIONS.READ)
  if (!hasPermission) return { error: 'Unauthorized' }

  try {
    const plan = await db.query.paymentPlans.findFirst({
      where: eq(paymentPlans.id, id),
      with: {
        patient: true,
        payments: {
          orderBy: (payments, { desc }) => [desc(payments.createdAt)],
        },
      },
    })

    if (!plan) {
      return { error: 'Payment plan not found' }
    }

    return { success: true, data: plan }
  } catch (error) {
    console.error('Error fetching payment plan details:', error)
    return { error: 'Failed to fetch payment plan details' }
  }
}

// Helper function to calculate expected amount based on frequency
function calculateExpectedAmount(
  startDate: Date,
  amountPerInstallment: number,
  frequency: string
): number {
  const now = new Date()
  const start = new Date(startDate)
  const diffTime = Math.abs(now.getTime() - start.getTime())
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  let expectedInstallments = 0

  switch (frequency) {
    case 'weekly':
      expectedInstallments = Math.floor(diffDays / 7)
      break
    case 'biweekly':
      expectedInstallments = Math.floor(diffDays / 14)
      break
    case 'monthly':
      expectedInstallments = Math.floor(diffDays / 30)
      break
    default:
      expectedInstallments = 0
  }

  return expectedInstallments * amountPerInstallment
}
