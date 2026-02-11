'use server'

import { db } from '@/lib/db'
import { smsMessages } from '@/lib/db/schema'
import { getCurrentUser } from '@/lib/rbac'
import { sendSMS } from '@/lib/actions/sms'

interface SendPaymentReminderParams {
    patientName: string
    patientPhone: string
    amountDue: number
    isChild: boolean
    guardianPhone?: string | null
}

export async function sendPaymentReminder({
    patientName,
    patientPhone,
    amountDue,
    isChild,
    guardianPhone,
}: SendPaymentReminderParams) {
    const currentUser = await getCurrentUser()
    if (!currentUser) return { error: 'Not authenticated' }

    try {
        // Determine which phone to use
        const recipientPhone = isChild && guardianPhone ? guardianPhone : patientPhone

        if (!recipientPhone) {
            return { error: 'No phone number available for this patient' }
        }

        // Format amount in GHS
        const formattedAmount = new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'GHS',
        }).format(amountDue / 100)

        // TODO: Fetch template from settings
        // For now, use a default message
        const message = `Dear ${patientName}, this is a gentle reminder about your outstanding payment of ${formattedAmount}. Please contact Framada Dental Clinic to arrange payment. Thank you!`

        // Send SMS
        const result = await sendSMS([
            {
                phone: recipientPhone,
                message,
            },
        ])

        if (!result.success) {
            return { error: result.error || 'Failed to send SMS' }
        }

        // Log the SMS
        await db.insert(smsMessages).values({
            recipient: recipientPhone,
            content: message,
            type: 'bulk',
            status: 'sent',
            from: 'Framada',
            sentById: currentUser.id,
        })

        return { success: true }
    } catch (error) {
        console.error('Error sending payment reminder:', error)
        return { error: 'Failed to send payment reminder' }
    }
}
