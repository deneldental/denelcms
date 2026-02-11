'use server'

import { db } from '@/lib/db'
import { appointments, patients } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { checkPermission, getCurrentUser } from '@/lib/rbac'
import { MODULES, ACTIONS } from '@/lib/modules'

const MODULE = MODULES.APPOINTMENTS

export async function getAppointments() {
  const currentUser = await getCurrentUser()
  if (!currentUser) return { error: 'Not authenticated' }

  if (!(await checkPermission(currentUser.id, MODULE, ACTIONS.READ)))
    return { error: 'Unauthorized' }

  try {
    const data = await db.query.appointments.findMany({
      with: { patient: true, doctor: { with: { user: true } } },
    })

    // Add "Dr" prefix to all doctor names
    const dataWithPrefix = data.map((appointment) => {
      if (appointment.doctor?.user) {
        const name = appointment.doctor.user.name || 'Unknown'
        const prefixedName =
          name.startsWith('Dr. ') || name.startsWith('Dr ') ? name : `Dr. ${name}`
        return {
          ...appointment,
          doctor: {
            ...appointment.doctor,
            user: {
              ...appointment.doctor.user,
              name: prefixedName,
            },
          },
        }
      }
      return appointment
    })

    return { success: true, data: dataWithPrefix }
  } catch {
    return { error: 'Failed to fetch appointments' }
  }
}

export async function createAppointment(
  data: typeof appointments.$inferInsert,
  sendSMS: boolean = false,
  dateStr?: string,
  timeStr?: string
) {
  const currentUser = await getCurrentUser()
  if (!currentUser) return { error: 'Not authenticated' }

  if (!(await checkPermission(currentUser.id, MODULE, ACTIONS.CREATE)))
    return { error: 'Unauthorized' }

  try {
    const [newItem] = await db.insert(appointments).values(data).returning()
    revalidatePath('/appointments')

    // Send SMS if requested
    let smsSent = false
    if (sendSMS && data.patientId) {
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
          // Get SMS template from environment variable
          const smsTemplate =
            process.env.APPOINTMENT_SMS ||
            'Dear {Patientname}, your appointment has been scheduled for {date} at {time}. Please arrive 30 minutes before time'

          // Format date and time
          const appointmentDate = data.date ? new Date(data.date) : new Date()
          const formattedDate = dateStr
            ? new Date(`${dateStr}T00:00:00`).toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })
            : appointmentDate.toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })

          const formattedTime = timeStr
            ? new Date(`2000-01-01T${timeStr}`).toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
              hour12: true,
            })
            : appointmentDate.toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
              hour12: true,
            })

          // Replace placeholders in template
          const message = smsTemplate
            .replace(/{Patientname}/g, patient.name || 'Patient')
            .replace(/{date}/g, formattedDate)
            .replace(/{time}/g, formattedTime)

          // Import and use sendSMS function
          const { sendSMS: sendSMSAction } = await import('./sms')

          const contactPhone =
            patient.isChild && patient.guardianPhone ? patient.guardianPhone : patient.phone!

          const smsResult = await sendSMSAction(
            [{ phone: contactPhone, message, patientId: patient.id }],
            process.env.SMS_SENDER_NAME || 'Framada',
            'appointment'
          )

          if (smsResult.success) {
            smsSent = true
          } else {
            // SMS failed
            console.warn('SMS send failed:', smsResult.error)
            // Return success but with smsError
            return { success: true, data: newItem, smsSent: false, smsError: smsResult.error }
          }
        }
      } catch (smsError) {
        console.warn('Failed to send appointment SMS:', smsError instanceof Error ? smsError.message : String(smsError))
        // Don't fail appointment creation if SMS fails, but return the error
        return { success: true, data: newItem, smsSent: false, smsError: smsError instanceof Error ? smsError.message : 'Unknown SMS error' }
      }
    }

    return { success: true, data: newItem, smsSent }
  } catch {
    return { error: 'Failed to create appointment' }
  }
}

export async function updateAppointment(
  id: string,
  data: Partial<typeof appointments.$inferInsert>,
  sendSMS: boolean = false
) {
  const currentUser = await getCurrentUser()
  if (!currentUser) return { error: 'Not authenticated' }

  if (!(await checkPermission(currentUser.id, MODULE, ACTIONS.UPDATE)))
    return { error: 'Unauthorized' }

  try {
    const [updatedItem] = await db
      .update(appointments)
      .set(data)
      .where(eq(appointments.id, id))
      .returning()

    revalidatePath('/appointments')

    // Send SMS if requested
    let smsSent = false
    if (sendSMS) {
      try {
        // Fetch appointment with patient details if not available
        const appointment = await db.query.appointments.findFirst({
          where: eq(appointments.id, id),
          with: {
            patient: true,
          },
        })

        if (appointment && appointment.patient && (appointment.patient.phone || (appointment.patient.isChild && appointment.patient.guardianPhone))) {
          // Get SMS template from environment variable
          let smsTemplate =
            process.env.APPOINTMENT_SMS ||
            'Dear {Patientname}, your appointment has been scheduled for {date} at {time}. Please arrive 30 minutes before time'

          // If rescheduled, replace "scheduled" with "rescheduled"
          if (data.status === 'rescheduled') {
            smsTemplate = smsTemplate.replace('scheduled', 'rescheduled')
          }

          // Format date and time
          const appointmentDate = data.date ? new Date(data.date) : new Date(appointment.date)
          const formattedDate = appointmentDate.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })

          const formattedTime = appointmentDate.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
          })

          // Replace placeholders in template
          const message = smsTemplate
            .replace(/{Patientname}/g, appointment.patient.name || 'Patient')
            .replace(/{date}/g, formattedDate)
            .replace(/{time}/g, formattedTime)

          // Import and use sendSMS function
          const { sendSMS: sendSMSAction } = await import('./sms')

          const contactPhone =
            appointment.patient.isChild && appointment.patient.guardianPhone
              ? appointment.patient.guardianPhone
              : appointment.patient.phone!

          const smsResult = await sendSMSAction(
            [{ phone: contactPhone, message, patientId: appointment.patient.id }],
            process.env.SMS_SENDER_NAME || 'Framada',
            'appointment'
          )

          if (smsResult.success) {
            smsSent = true
          } else {
            // SMS failed
            console.warn('SMS send failed:', smsResult.error)
            // Return success but with smsError
            return { success: true, data: updatedItem, smsSent: false, smsError: smsResult.error }
          }
        }
      } catch (smsError) {
        console.warn('Failed to send reschedule SMS:', smsError instanceof Error ? smsError.message : String(smsError))
        return { success: true, data: updatedItem, smsSent: false, smsError: smsError instanceof Error ? smsError.message : 'Unknown SMS error' }
      }
    }

    return { success: true, data: updatedItem, smsSent }
  } catch (error) {
    console.error('Update appointment error:', error)
    return { error: 'Failed to update appointment' }
  }
}

export async function deleteAppointment(id: string) {
  const currentUser = await getCurrentUser()
  if (!currentUser) return { error: 'Not authenticated' }

  if (!(await checkPermission(currentUser.id, MODULE, ACTIONS.DELETE)))
    return { error: 'Unauthorized' }

  try {
    await db.delete(appointments).where(eq(appointments.id, id))
    revalidatePath('/appointments')
    return { success: true }
  } catch {
    return { error: 'Failed to delete appointment' }
  }
}
