import { getMedicalRecords, getPendingMedicalRecords } from '@/lib/actions/medical-records'
import { MedicalRecordsClient } from './medical-records-client'
import { getCurrentUser } from '@/lib/rbac'
import { ROLES } from '@/lib/modules'
import { db } from '@/lib/db'
import { user, doctors } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export default async function MedicalRecordsPage() {
  const result = await getMedicalRecords()

  if (!result.success) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Medical Records</h1>
          <p className="text-muted-foreground mt-2 text-destructive">
            {result.error ||
              'You do not have permission to view medical records. Only doctors and admins can access this page.'}
          </p>
        </div>
      </div>
    )
  }

  const records = result.data || []

  // Fetch pending medical records
  const pendingResult = await getPendingMedicalRecords()
  const pendingRecords = pendingResult.success ? pendingResult.data || [] : []

  // Get current user role and doctor ID if applicable
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

  return (
    <MedicalRecordsClient
      records={records}
      pendingRecords={pendingRecords}
      currentDoctorId={doctorId}
      currentDoctorName={doctorName}
      userRole={userRole}
      isDoctor={isDoctor}
    />
  )
}
