'use server'

import { db } from '@/lib/db'
import { appointments, smsMessages } from '@/lib/db/schema'
import { eq, and, gte, lte } from 'drizzle-orm'
import { getCurrentUser } from '@/lib/rbac'
import { checkPermission } from '@/lib/rbac'
import { MODULES, ACTIONS } from '@/lib/modules'
import { revalidatePath } from 'next/cache'
import { logError, logger, logWarn } from '@/lib/logger'
import { BIRTHDAY_LOOKUP_DAYS } from '@/lib/constants'

const MODULE = MODULES.MESSAGING

// Get upcoming birthdays (next 30 days)
export async function getUpcomingBirthdays() {
  const currentUser = await getCurrentUser()
  if (!currentUser) return { error: 'Not authenticated' }

  if (!(await checkPermission(currentUser.id, MODULE, ACTIONS.READ)))
    return { error: 'Unauthorized' }

  try {
    const allPatients = await db.query.patients.findMany({
      columns: {
        id: true,
        name: true,
        phone: true,
        dob: true,
        isChild: true,
        guardianPhone: true,
      },
    })

    const today = new Date()
    const upcomingBirthdays: Array<{
      patientId: string
      patientName: string
      phone: string | null
      dateOfBirth: Date | null
      birthdayDate: string
      daysUntil: number
      age: number
    }> = []

    for (let i = 0; i < BIRTHDAY_LOOKUP_DAYS; i++) {
      const checkDate = new Date(today)
      checkDate.setDate(today.getDate() + i)
      const checkMonth = checkDate.getMonth() + 1
      const checkDay = checkDate.getDate()
      const checkYear = checkDate.getFullYear()

      const patientsWithBirthday = allPatients
        .filter((patient) => {
          if (!patient.dob) return false
          const dob = new Date(patient.dob)
          return dob.getMonth() + 1 === checkMonth && dob.getDate() === checkDay
        })
        .map((patient) => {
          const dob = patient.dob ? new Date(patient.dob) : new Date()
          // Use guardian phone if patient is a child
          const contactPhone =
            patient.isChild && patient.guardianPhone ? patient.guardianPhone : patient.phone

          return {
            patientId: patient.id,
            patientName: patient.name || 'Unknown',
            phone: contactPhone,
            dateOfBirth: patient.dob,
            birthdayDate: `${checkYear}-${String(checkMonth).padStart(2, '0')}-${String(checkDay).padStart(2, '0')}`,
            daysUntil: i,
            age: checkYear - dob.getFullYear(),
          }
        })

      upcomingBirthdays.push(...patientsWithBirthday)
    }

    // Sort by days until birthday
    upcomingBirthdays.sort((a, b) => a.daysUntil - b.daysUntil)

    return { success: true, data: upcomingBirthdays }
  } catch (error: unknown) {
    logError(error, { action: 'getUpcomingBirthdays' })
    const errorMessage = error instanceof Error ? error.message : String(error)
    return { error: `Failed to fetch upcoming birthdays: ${errorMessage}` }
  }
}

// Get appointments for follow-up SMS (completed appointments from last 7 days)
export async function getFollowupAppointments() {
  const currentUser = await getCurrentUser()
  if (!currentUser) return { error: 'Not authenticated' }

  if (!(await checkPermission(currentUser.id, MODULE, ACTIONS.READ)))
    return { error: 'Unauthorized' }

  try {
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const today = new Date()

    const completedAppointments = await db.query.appointments.findMany({
      where: and(
        eq(appointments.status, 'completed'),
        gte(appointments.date, sevenDaysAgo),
        lte(appointments.date, today)
      ),
      with: {
        patient: {
          columns: {
            id: true,
            name: true,
            phone: true,
            isChild: true,
            guardianPhone: true,
          },
        },
      },
      orderBy: (appointments, { desc }) => [desc(appointments.date)],
    })

    const followups = completedAppointments.map((appointment) => {
      // Use guardian phone if patient is a child
      const contactPhone =
        appointment.patient?.isChild && appointment.patient?.guardianPhone
          ? appointment.patient.guardianPhone
          : appointment.patient?.phone

      return {
        appointmentId: appointment.id,
        patientId: appointment.patientId,
        patientName: appointment.patient?.name || 'Unknown',
        phone: contactPhone || null,
        appointmentDate: appointment.date,
        appointmentType: appointment.type || 'consultation',
      }
    })

    return { success: true, data: followups }
  } catch (error: unknown) {
    logError(error, { action: 'getFollowupAppointments' })
    const errorMessage = error instanceof Error ? error.message : String(error)
    return { error: `Failed to fetch follow-up appointments: ${errorMessage}` }
  }
}

// Send SMS via Hubtel API
export async function sendSMS(
  recipients: Array<{ phone: string; message: string; patientId?: string }>,
  from: string = 'Framada',
  type: 'bulk' | 'birthday' | 'followup' | 'appointment' = 'bulk'
) {
  const currentUser = await getCurrentUser()
  if (!currentUser) return { error: 'Not authenticated' }

  if (!(await checkPermission(currentUser.id, MODULE, ACTIONS.CREATE)))
    return { error: 'Unauthorized' }

  try {
    // Get Hubtel credentials from environment variables
    const clientId = process.env.HUBTEL_CLIENT_ID
    const clientSecret = process.env.HUBTEL_CLIENT_SECRET

    if (!clientId || !clientSecret) {
      return { error: 'Hubtel credentials not configured' }
    }

    // Format phone numbers using utility function
    const { formatPhoneNumber } = await import('@/lib/utils/phone')
    const personalizedRecipients = recipients.map((recipient) => ({
      To: formatPhoneNumber(recipient.phone),
      Content: recipient.message,
    }))

    // Prepare the request body
    const requestBody = {
      From: from,
      personalizedRecipients,
    }

    // Create Basic Auth header
    const authHeader = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')

    // Send bulk SMS via Hubtel API
    const response = await fetch('https://sms.hubtel.com/v1/messages/batch/personalized/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${authHeader}`,
        Accept: 'application/json',
      },
      body: JSON.stringify(requestBody),
    })

    if (!response.ok) {
      const errorText = await response.text()
      logError(new Error('Hubtel API error'), { errorText, status: response.status })

      // Store failed SMS in database
      try {
        await db.insert(smsMessages).values(
          recipients.map((recipient) => ({
            batchId: 'FAILED',
            messageId: 'FAILED',
            recipient: recipient.phone,
            content: recipient.message,
            type: type,
            status: 'failed',
            patientId: recipient.patientId || null,
            from: from,
            sentById: currentUser?.id || null,
          }))
        )
      } catch (dbError) {
        logError(dbError, { action: 'storeFailedSMS' })
      }

      return { error: 'Failed to send SMS', details: errorText }
    }

    const result = await response.json()

    // Store SMS messages in database for tracking
    try {
      const batchId = result.batchId || result.id || result.batch_id
      const messages = result.messages || result.data?.messages || []

      // If it's a batch with multiple messages in the response
      if (messages.length > 0 && messages.length === recipients.length) {
        // Define interface locally to avoid import issues
        interface HubtelMessage {
          messageId?: string
          id?: string
          message_id?: string
          status?: string
        }
        await db.insert(smsMessages).values(
          messages.map((msg: HubtelMessage, index: number) => ({
            batchId: batchId,
            messageId: msg.messageId || msg.id || msg.message_id,
            recipient: recipients[index]?.phone || '',
            content: recipients[index]?.message || '',
            type: type,
            status: msg.status || 'sent',
            patientId: recipients[index]?.patientId || null,
            from: from,
            sentById: currentUser?.id || null,
          }))
        )
      } else {
        // Single message or batch without individual message details in response
        // Store one record per recipient
        await db.insert(smsMessages).values(
          recipients.map((recipient, index) => {
            // Try to get individual message ID if available
            const msg = messages?.[index]
            return {
              batchId: batchId,
              messageId:
                msg?.messageId ||
                msg?.id ||
                msg?.message_id ||
                result.messageId ||
                result.id ||
                null,
              recipient: recipient.phone,
              content: recipient.message,
              type: type,
              status: msg?.status || 'sent',
              patientId: recipient.patientId || null,
              from: from,
              sentById: currentUser?.id || null,
            }
          })
        )
      }
    } catch (trackError: unknown) {
      const errorMessage = trackError instanceof Error ? trackError.message : String(trackError)
      logWarn('Failed to track SMS in database', { error: errorMessage })
      // Don't fail the SMS send if tracking fails
    }

    logger.info({ recipientCount: recipients.length, type }, 'SMS sent successfully')
    revalidatePath('/messaging')
    return { success: true, data: result }
  } catch (error: unknown) {
    logError(error, { action: 'sendSMS', recipientCount: recipients.length })
    const errorMessage = error instanceof Error ? error.message : String(error)

    // Store failed SMS in database for network errors / exceptions
    try {
      if (currentUser) {
        await db.insert(smsMessages).values(
          recipients.map((recipient) => ({
            batchId: 'FAILED',
            messageId: 'FAILED',
            recipient: recipient.phone,
            content: recipient.message,
            type: type,
            status: 'failed',
            patientId: recipient.patientId || null,
            from: from,
            sentById: currentUser?.id || null,
          }))
        )
      }
    } catch (dbError) {
      logError(dbError, { action: 'storeFailedSMS_exception' })
    }

    return { error: `Failed to send SMS: ${errorMessage}` }
  }
}

// Get failed SMS messages
export async function getFailedSMSMessages() {
  const currentUser = await getCurrentUser()
  if (!currentUser) return { error: 'Not authenticated' }

  if (!(await checkPermission(currentUser.id, MODULE, ACTIONS.READ)))
    return { error: 'Unauthorized' }

  try {
    const data = await db.query.smsMessages.findMany({
      where: eq(smsMessages.status, 'failed'),
      orderBy: (smsMessages, { desc }) => [desc(smsMessages.createdAt)],
      with: {
        patient: {
          columns: {
            id: true,
            name: true,
          },
        },
      },
    })
    return { success: true, data }
  } catch (error: unknown) {
    logError(error, { action: 'getFailedSMSMessages' })
    const errorMessage = error instanceof Error ? error.message : String(error)
    return { error: `Failed to fetch failed SMS messages: ${errorMessage}` }
  }
}

// Retry a failed SMS
export async function retrySMS(messageId: string) {
  const currentUser = await getCurrentUser()
  if (!currentUser) return { error: 'Not authenticated' }

  if (!(await checkPermission(currentUser.id, MODULE, ACTIONS.CREATE)))
    return { error: 'Unauthorized' }

  try {
    // 1. Get the failed message
    const failedMessage = await db.query.smsMessages.findFirst({
      where: and(eq(smsMessages.id, messageId), eq(smsMessages.status, 'failed')),
    })

    if (!failedMessage) {
      return { error: 'Failed message not found or already processed' }
    }

    // 2. Resend the SMS
    const result = await sendSMS(
      [{
        phone: failedMessage.recipient,
        message: failedMessage.content,
        patientId: failedMessage.patientId || undefined
      }],
      failedMessage.from,
      (failedMessage.type as 'bulk' | 'birthday' | 'followup' | 'appointment') || 'bulk'
    )

    if (result.success) {
      // 3. Update the *original* failed message status to 'retried' so it disappears from the list
      await db
        .update(smsMessages)
        .set({ status: 'retried' })
        .where(eq(smsMessages.id, messageId))

      revalidatePath('/messaging')
      return { success: true }
    } else {
      return { error: result.error || 'Failed to resend SMS' }
    }
  } catch (error: unknown) {
    logError(error, { action: 'retrySMS', messageId })
    const errorMessage = error instanceof Error ? error.message : String(error)
    return { error: `Failed to retry SMS: ${errorMessage}` }
  }
}

// Get all sent SMS messages
export async function getSentSMSMessages() {
  const currentUser = await getCurrentUser()
  if (!currentUser) return { error: 'Not authenticated' }

  if (!(await checkPermission(currentUser.id, MODULE, ACTIONS.READ)))
    return { error: 'Unauthorized' }

  try {
    const data = await db.query.smsMessages.findMany({
      orderBy: (smsMessages, { desc }) => [desc(smsMessages.sentAt)],
      with: {
        patient: {
          columns: {
            id: true,
            name: true,
          },
        },
      },
    })
    return { success: true, data }
  } catch (error: unknown) {
    logError(error, { action: 'getSentSMSMessages' })
    const errorMessage = error instanceof Error ? error.message : String(error)
    return { error: `Failed to fetch sent SMS messages: ${errorMessage}` }
  }
}

// Get SMS status from Hubtel API
export async function getSMSStatus(messageId: string, isBatch: boolean = false) {
  const currentUser = await getCurrentUser()
  if (!currentUser) return { error: 'Not authenticated' }

  if (!(await checkPermission(currentUser.id, MODULE, ACTIONS.READ)))
    return { error: 'Unauthorized' }

  try {
    // Get Hubtel credentials from environment variables
    const clientId = process.env.HUBTEL_CLIENT_ID
    const clientSecret = process.env.HUBTEL_CLIENT_SECRET

    if (!clientId || !clientSecret) {
      return { error: 'Hubtel credentials not configured' }
    }

    if (!messageId || !messageId.trim()) {
      return { error: 'Message ID or Batch ID is required' }
    }

    // Create Basic Auth header
    const authHeader = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')

    // Determine the endpoint based on whether it's a batch or single message
    const endpoint = isBatch
      ? `https://sms.hubtel.com/v1/messages/${messageId.trim()}`
      : `https://sms.hubtel.com/v1/messages/${messageId.trim()}`

    // Get SMS status from Hubtel API
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${authHeader}`,
        Accept: 'application/json',
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      logError(new Error('Hubtel API error'), { errorText, status: response.status, messageId })
      return { error: 'Failed to get SMS status', details: errorText }
    }

    const result = await response.json()

    return { success: true, data: result }
  } catch (error: unknown) {
    logError(error, { action: 'getSMSStatus', messageId })
    const errorMessage = error instanceof Error ? error.message : String(error)
    return { error: `Failed to fetch SMS status: ${errorMessage}` }
  }
}

// Get prepaid balance from Hubtel API
export async function getPrepaidBalance() {
  const currentUser = await getCurrentUser()
  if (!currentUser) return { error: 'Not authenticated' }

  if (!(await checkPermission(currentUser.id, MODULE, ACTIONS.READ)))
    return { error: 'Unauthorized' }

  try {
    // Get Hubtel credentials and prepaid deposit ID from environment variables
    const clientId = process.env.HUBTEL_CLIENT_ID
    const clientSecret = process.env.HUBTEL_CLIENT_SECRET
    const prepaidDepositId = process.env.PREPAID_DEPOSIT_ID

    if (!clientId || !clientSecret) {
      return { error: 'Hubtel credentials not configured' }
    }

    if (!prepaidDepositId) {
      return { error: 'Prepaid deposit ID not configured' }
    }

    // Create Basic Auth header
    const authHeader = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')

    // Get prepaid balance from Hubtel API
    const endpoint = `https://trnf.hubtel.com/api/inter-transfers/prepaid/${prepaidDepositId}`
    logger.debug({ endpoint }, 'Fetching prepaid balance')

    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${authHeader}`,
        Accept: 'application/json',
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      logError(new Error('Hubtel API error'), {
        status: response.status,
        statusText: response.statusText,
        endpoint,
        errorText,
      })

      let errorMessage = 'Failed to get prepaid balance'
      try {
        const errorJson = JSON.parse(errorText)
        errorMessage =
          errorJson.message || errorJson.error || errorJson.errorMessage || errorMessage
      } catch {
        // If not JSON, use the text as-is
        if (errorText) {
          errorMessage = errorText.length > 100 ? `${errorText.substring(0, 100)}...` : errorText
        }
      }

      if (response.status === 401) {
        errorMessage =
          'Authentication failed. Please check Hubtel credentials (HUBTEL_CLIENT_ID and HUBTEL_CLIENT_SECRET).'
      } else if (response.status === 404) {
        errorMessage = `Prepaid deposit ID not found (Status 404). Please verify PREPAID_DEPOSIT_ID: ${prepaidDepositId.substring(0, 4)}...`
      } else if (response.status === 403) {
        errorMessage = 'Access forbidden. Please check account permissions and prepaid deposit ID.'
      } else if (response.status >= 500) {
        errorMessage = `Hubtel API server error (${response.status}). Please try again later.`
      }

      return { error: errorMessage, details: errorText, status: response.status }
    }

    const result = await response.json()
    logger.debug({ balance: result }, 'Prepaid balance fetched successfully')

    return { success: true, data: result }
  } catch (error: unknown) {
    logError(error, {
      action: 'getPrepaidBalance',
    })

    let errorMessage = 'Failed to fetch prepaid balance'
    if (error instanceof Error) {
      errorMessage = error.message
    } else if (typeof error === 'string') {
      errorMessage = error
    }

    // Check for common network errors
    interface ErrorWithCode {
      code?: string
      message?: string
      stack?: string
    }
    const errorWithCode = error as ErrorWithCode
    if (errorWithCode?.message?.includes('fetch')) {
      errorMessage =
        'Network error. Please check your internet connection and Hubtel API availability.'
    } else if (errorWithCode?.code === 'ENOTFOUND' || errorWithCode?.code === 'ECONNREFUSED') {
      errorMessage =
        'Cannot connect to Hubtel API. Please check the endpoint URL and network connectivity.'
    }

    return { error: errorMessage, details: errorWithCode?.stack || String(error) }
  }
}
