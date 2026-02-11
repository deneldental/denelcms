export const runtime = 'edge';

import { getAppointments } from '@/lib/actions/appointments'
import { getDoctorUnavailability } from '@/lib/actions/doctor-availability'
import { AppointmentsShell } from '@/components/appointments/appointments-shell'
import { getCurrentUser } from '@/lib/rbac'
import { ROLES } from '@/lib/modules'
import { db } from '@/lib/db'
import { user, doctors } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export default async function AppointmentsPage() {
  // Get current user role
  const currentUser = await getCurrentUser()
  const dbUser = currentUser
    ? await db.query.user.findFirst({
        where: eq(user.id, currentUser.id),
        with: {
          role: {
            columns: {
              id: true,
            },
          },
        },
      })
    : null

  const userRole = dbUser?.role?.id
  const isDoctor = userRole === ROLES.DOCTOR

  // Get doctor ID and name if user is a doctor
  let doctorId: string | undefined
  let doctorName: string | undefined
  if (isDoctor && currentUser) {
    const doctorRecord = await db.query.doctors.findFirst({
      where: eq(doctors.userId, currentUser.id),
      columns: {
        id: true,
      },
      with: {
        user: {
          columns: {
            name: true,
          },
        },
      },
    })
    doctorId = doctorRecord?.id
    doctorName = doctorRecord?.user?.name || undefined
  }

  // In a real app we'd filter by the date range from searchParams
  const appointmentsResult = await getAppointments()
  const unavailabilityResult = await getDoctorUnavailability()

  const appointments = appointmentsResult.success ? appointmentsResult.data : []
  const unavailability = unavailabilityResult.success ? unavailabilityResult.data : []

  return (
    <div className="p-6">
      <AppointmentsShell
        appointments={appointments || []}
        unavailability={unavailability || []}
        userRole={userRole}
        canCreateAppointments={!isDoctor}
        currentDoctorId={doctorId}
        currentDoctorName={doctorName}
      />
    </div>
  )
}
