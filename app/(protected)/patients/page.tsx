import { getPatients } from '@/lib/actions/patients'
import { PatientList } from '@/components/patients/patient-list'
import { AddPatientDialog } from '@/components/patients/add-patient-dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { getCurrentUser } from '@/lib/rbac'
import { ROLES } from '@/lib/modules'
import { db } from '@/lib/db'
import { user } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export default async function PatientsPage() {
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

  const result = await getPatients()

  // In a real app we might handle error state better
  const allPatients = result.success ? result.data : []

  const generalPatients = allPatients.filter((p) => p.type === 'general' && !p.isOrtho)
  const legacyPatients = allPatients.filter((p) => p.type === 'legacy')
  const orthoPatients = allPatients.filter((p) => p.isOrtho === true)
  const externalPatients = allPatients.filter((p) => p.type === 'external')

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Patients</h1>
          <p className="text-muted-foreground">
            {isDoctor
              ? 'View patient records and information.'
              : 'Manage patient records and information.'}
          </p>
        </div>
        {!isDoctor && <AddPatientDialog />}
      </div>

      <Tabs defaultValue="general" className="w-full">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="ortho">Ortho</TabsTrigger>
          <TabsTrigger value="legacy">Legacy Import</TabsTrigger>
          <TabsTrigger value="external">External</TabsTrigger>
          <TabsTrigger value="all">All Patients</TabsTrigger>
        </TabsList>
        <TabsContent value="general">
          <PatientList data={generalPatients} />
        </TabsContent>
        <TabsContent value="ortho">
          <PatientList data={orthoPatients} />
        </TabsContent>
        <TabsContent value="legacy">
          <PatientList data={legacyPatients} />
        </TabsContent>
        <TabsContent value="external">
          <PatientList data={externalPatients} />
        </TabsContent>
        <TabsContent value="all">
          <PatientList data={allPatients} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
