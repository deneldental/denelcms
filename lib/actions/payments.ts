'use server'

import { db } from '@/lib/db'
import { payments, patients } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { checkPermission, getCurrentUser } from '@/lib/rbac'
import { MODULES, ACTIONS } from '@/lib/modules'
import { getPaymentPlanByPatientId } from './payment-plans'

const MODULE = MODULES.PAYMENTS

export async function getPayments() {
  const currentUser = await getCurrentUser()
  if (!currentUser) return { error: 'Not authenticated' }

  if (!(await checkPermission(currentUser.id, MODULE, ACTIONS.READ)))
    return { error: 'Unauthorized' }

  try {
    const data = await db.query.payments.findMany({
      with: {
        patient: true,
        paymentPlan: true,
      },
      orderBy: (payments, { desc }) => [desc(payments.createdAt)],
    })
    return { success: true, data }
  } catch {
    return { error: 'Failed to fetch payments' }
  }
}

export async function getPaymentsByPatientId(patientId: string) {
  const currentUser = await getCurrentUser()
  if (!currentUser) return { error: 'Not authenticated' }

  if (!(await checkPermission(currentUser.id, MODULE, ACTIONS.READ)))
    return { error: 'Unauthorized' }

  try {
    const data = await db.query.payments.findMany({
      where: eq(payments.patientId, patientId),
      with: {
        patient: true,
        paymentPlan: true,
      },
      orderBy: (payments, { desc }) => [desc(payments.createdAt)],
    })
    return { success: true, data }
  } catch {
    return { error: 'Failed to fetch payments' }
  }
}

export async function createPayment(data: typeof payments.$inferInsert) {
  const currentUser = await getCurrentUser()
  if (!currentUser) return { error: 'Not authenticated' }

  if (!(await checkPermission(currentUser.id, MODULE, ACTIONS.CREATE)))
    return { error: 'Unauthorized' }

  try {
    // Calculate and store balance for payment plan payments
    let balance: number | undefined = undefined

    if (data.paymentPlanId && data.patientId && data.status === 'completed') {
      // Get payment plan details
      const planResult = await getPaymentPlanByPatientId(data.patientId)

      if (planResult.success && planResult.data) {
        // Get all completed payments for this plan (excluding the current one being created)
        const existingPayments = await db
          .select()
          .from(payments)
          .where(
            and(
              eq(payments.patientId, data.patientId),
              eq(payments.paymentPlanId, data.paymentPlanId),
              eq(payments.status, 'completed')
            )
          )

        // Calculate total paid (excluding current payment)
        const totalPaid = existingPayments.reduce((sum, p) => sum + p.amount, 0)

        // Calculate balance after this payment: totalAmount - (totalPaid + currentPayment)
        balance = planResult.data.totalAmount - totalPaid - (data.amount || 0)
      }
    }

    const paymentData = {
      ...data,
      balance: balance !== undefined ? balance : null,
    }

    const [newItem] = await db.insert(payments).values(paymentData).returning()

    // Send SMS notification if requested
    if (data.sendNotification && data.patientId && data.status === 'completed') {
      try {
        // Get patient details
        const patient = await db.query.patients.findFirst({
          where: eq(patients.id, data.patientId),
          columns: {
            id: true,
            name: true,
            phone: true,
            isChild: true,
            guardianPhone: true,
          },
        })

        if (patient && (patient.phone || (patient.isChild && patient.guardianPhone))) {
          // Import sendSMS function
          const { sendSMS } = await import('./sms')

          // Get description - for plan payments, use payment plan notes if description is empty
          let descriptionText = data.description || ''
          if (data.paymentPlanId && !descriptionText) {
            const planResult = await getPaymentPlanByPatientId(data.patientId)
            if (planResult.success && planResult.data?.notes) {
              descriptionText = planResult.data.notes
            }
          }

          // Parse description to get treatment types
          const parts = descriptionText.split(' - ')
          const treatmentTypes = parts[0] || 'Service Payment'

          // Format amount
          const amountGHS = (data.amount / 100).toFixed(2)

          let message = ''
          if (data.paymentPlanId) {
            // Payment plan payment - include balance
            const balanceGHS =
              balance !== undefined && balance !== null ? (balance / 100).toFixed(2) : '0.00'
            const paymentSmsTemplate =
              process.env.PAYMENT_PLAN_SMS ||
              'Dear {Patientname}, thank you for your payment of GHS {amount} for {treatmenttypes}. Your current balance is GHS {balance}. Thank you!'

            message = paymentSmsTemplate
              .replace(/{Patientname}/g, patient.name || 'Patient')
              .replace(/{amount}/g, amountGHS)
              .replace(/{treatmenttypes}/g, treatmentTypes)
              .replace(/{balance}/g, balanceGHS)
          } else {
            // One-time payment
            const paymentSmsTemplate =
              process.env.PAYMENT_SMS ||
              'Dear {Patientname}, thank you for your payment of GHS {amount} for {treatmenttypes}. Thank you!'

            message = paymentSmsTemplate
              .replace(/{Patientname}/g, patient.name || 'Patient')
              .replace(/{amount}/g, amountGHS)
              .replace(/{treatmenttypes}/g, treatmentTypes)
          }

          const contactPhone =
            patient.isChild && patient.guardianPhone ? patient.guardianPhone : patient.phone!

          const smsResult = await sendSMS(
            [{ phone: contactPhone, message, patientId: patient.id }],
            process.env.SMS_SENDER_NAME || 'Framada',
            'bulk'
          )

          if (smsResult.error) {
            console.warn('SMS send failed:', smsResult.error)
            // Return success but with smsError
            revalidatePath('/payments')
            revalidatePath(`/patients/${data.patientId}`)
            return { success: true, data: newItem, smsError: smsResult.error }
          }
        }
      } catch (smsError) {
        console.warn('Failed to send payment SMS:', smsError instanceof Error ? smsError.message : String(smsError))
        // Don't fail payment creation if SMS fails, but return the error
        revalidatePath('/payments')
        revalidatePath(`/patients/${data.patientId}`)
        return { success: true, data: newItem, smsError: smsError instanceof Error ? smsError.message : 'Unknown SMS error' }
      }
    }

    revalidatePath('/payments')
    revalidatePath(`/patients/${data.patientId}`)
    return { success: true, data: newItem }
  } catch (error) {
    console.error('Payment creation error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to create payment'
    return { error: errorMessage }
  }
}

export async function updatePayment(id: string, data: Partial<typeof payments.$inferInsert>) {
  const currentUser = await getCurrentUser()
  if (!currentUser) return { error: 'Not authenticated' }

  if (!(await checkPermission(currentUser.id, MODULE, ACTIONS.UPDATE)))
    return { error: 'Unauthorized' }

  try {
    await db.update(payments).set(data).where(eq(payments.id, id))
    revalidatePath('/payments')
    return { success: true }
  } catch {
    return { error: 'Failed to update payment' }
  }
}

export async function deletePayment(id: string) {
  const currentUser = await getCurrentUser()
  if (!currentUser) return { error: 'Not authenticated' }

  if (!(await checkPermission(currentUser.id, MODULE, ACTIONS.DELETE)))
    return { error: 'Unauthorized' }

  try {
    await db.delete(payments).where(eq(payments.id, id))
    revalidatePath('/payments')
    return { success: true }
  } catch {
    return { error: 'Failed to delete payment' }
  }
}
