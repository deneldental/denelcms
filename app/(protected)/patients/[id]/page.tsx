import { getPatient } from '@/lib/actions/patients'
import { getMedicalRecordsByPatientId } from '@/lib/actions/medical-records'
import { getPaymentsByPatientId } from '@/lib/actions/payments'
import { getPaymentPlanByPatientId } from '@/lib/actions/payment-plans'
import { getUserRole } from '@/lib/actions/users'
import { getCurrentUser, isDoctorOrAdmin } from '@/lib/rbac'
import { ROLES } from '@/lib/modules'
import { notFound } from 'next/navigation'
import { PatientDetailContent } from '@/components/patients/patient-detail-content'

export default async function PatientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const currentUser = await getCurrentUser()

  const [patientResult, medicalRecordsResult, paymentsResult, paymentPlanResult, userRoleResult] =
    await Promise.all([
      getPatient(id),
      getMedicalRecordsByPatientId(id),
      getPaymentsByPatientId(id),
      getPaymentPlanByPatientId(id),
      currentUser
        ? getUserRole(currentUser.id)
        : Promise.resolve({ success: false, error: 'Not authenticated' }),
    ])

  if (!patientResult.success || !patientResult.data) {
    notFound()
  }

  const patient = patientResult.data
  const medicalRecords = medicalRecordsResult.success ? medicalRecordsResult.data : []
  const payments = paymentsResult.success ? paymentsResult.data : []
  const paymentPlan = paymentPlanResult.success ? paymentPlanResult.data : null
  const userRole = userRoleResult.success && 'data' in userRoleResult ? userRoleResult.data : null
  const isAdmin = userRole === ROLES.ADMIN
  const isDoctor = userRole === ROLES.DOCTOR
  const canViewMedicalRecords = currentUser ? await isDoctorOrAdmin(currentUser.id) : false
  const canEditPatient = !isDoctor // Doctors cannot edit patient info

  return (
    <PatientDetailContent
      patient={patient}
      medicalRecords={canViewMedicalRecords ? medicalRecords : []}
      payments={payments}
      paymentPlan={paymentPlan}
      isAdmin={isAdmin}
      canViewMedicalRecords={canViewMedicalRecords}
      canEdit={canEditPatient}
    />
  )
}
