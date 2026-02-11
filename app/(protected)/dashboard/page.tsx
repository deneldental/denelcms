export const runtime = 'edge';

import { DashboardContent } from '@/components/dashboard/dashboard-content'
import { ReceptionistDashboardContent } from '@/components/dashboard/receptionist-dashboard-content'
import { DoctorDashboardContent } from '@/components/dashboard/doctor-dashboard-content'
import {
  getDashboardStats,
  getReceptionistDashboardStats,
  getDoctorDashboardStats,
  getUpcomingAppointments,
  getRecentReports,
  getRecentMedicalRecords,
  getLowStockItems,
  getBirthdaysAndFollowups,
} from '@/lib/actions/dashboard'
import { getOverduePaymentPlans } from '@/lib/actions/payment-plans'
import { getCurrentUser } from '@/lib/rbac'
import { ROLES } from '@/lib/modules'
import { db } from '@/lib/db'
import { user } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export default async function DashboardPage() {
  // Get current user and their role
  const currentUser = await getCurrentUser()
  if (!currentUser) {
    return <div className="p-6">Not authenticated</div>
  }

  const dbUser = await db.query.user.findFirst({
    where: eq(user.id, currentUser.id),
    with: {
      role: {
        columns: {
          id: true,
        },
      },
    },
  })

  const userRole = dbUser?.role?.id

  // Check user role
  const isReceptionist = userRole === ROLES.RECEPTIONIST
  const isDoctor = userRole === ROLES.DOCTOR

  // Fetch appropriate stats based on role
  const statsFunction = isReceptionist
    ? getReceptionistDashboardStats
    : isDoctor
      ? getDoctorDashboardStats
      : getDashboardStats

  // Fetch dashboard data based on role
  if (isDoctor) {
    // Doctor-specific data
    const [statsResult, upcomingAppointmentsResult, recentMedicalRecordsResult] = await Promise.all(
      [getDoctorDashboardStats(), getUpcomingAppointments(10), getRecentMedicalRecords(10)]
    )

    const upcomingAppointments = upcomingAppointmentsResult.success
      ? upcomingAppointmentsResult.data
      : []

    const recentMedicalRecords = recentMedicalRecordsResult.success
      ? recentMedicalRecordsResult.data
      : []

    type DoctorStats = {
      totalOrthoPatients: number
      signedConsentForms: number
      totalMedicalRecords: number
      todayCheckedIn: number
      todayBooked: number
    }

    const doctorStats: DoctorStats = statsResult.success
      ? (statsResult.data as DoctorStats)
      : {
        totalOrthoPatients: 0,
        signedConsentForms: 0,
        totalMedicalRecords: 0,
        todayCheckedIn: 0,
        todayBooked: 0,
      }

    return (
      <DoctorDashboardContent
        stats={doctorStats}
        upcomingAppointments={upcomingAppointments}
        recentMedicalRecords={recentMedicalRecords}
      />
    )
  }

  // Fetch all dashboard data in parallel for admin/receptionist
  const [
    statsResult,
    upcomingAppointmentsResult,
    recentReportsResult,
    lowStockItemsResult,
    birthdaysAndFollowupsResult,
    overduePaymentsResult,
  ] = await Promise.all([
    statsFunction(),
    getUpcomingAppointments(10),
    getRecentReports(7),
    getLowStockItems(10),
    getBirthdaysAndFollowups(),
    getOverduePaymentPlans(),
  ])

  // Provide default values if any query fails
  const upcomingAppointments = upcomingAppointmentsResult.success
    ? upcomingAppointmentsResult.data
    : []

  const recentReports = recentReportsResult.success ? recentReportsResult.data : []

  const lowStockItems = lowStockItemsResult.success ? lowStockItemsResult.data : []

  const birthdaysAndFollowups = birthdaysAndFollowupsResult.success
    ? birthdaysAndFollowupsResult.data
    : { birthdays: [], followups: [] }

  const overduePayments = overduePaymentsResult.success ? overduePaymentsResult.data : []

  // Render appropriate dashboard based on role
  if (isReceptionist) {
    type ReceptionistStats = {
      totalPatients: number
      todayPayments: number
      todayExpenses: number
      todayCheckedIn: number
      todayBooked: number
    }

    const receptionistStats: ReceptionistStats = statsResult.success
      ? (statsResult.data as ReceptionistStats)
      : {
        totalPatients: 0,
        todayPayments: 0,
        todayExpenses: 0,
        todayCheckedIn: 0,
        todayBooked: 0,
      }

    return (
      <ReceptionistDashboardContent
        stats={receptionistStats}
        upcomingAppointments={upcomingAppointments}
        lowStockItems={lowStockItems}
        birthdaysAndFollowups={birthdaysAndFollowups}
        overduePayments={overduePayments}
      />
    )
  }

  // Admin/Doctor dashboard
  type AdminStats = {
    totalPatients: number
    totalRevenue: number
    totalExpenses: number
    checkedIn: number
    booked: number
  }

  const adminStats: AdminStats = statsResult.success
    ? (statsResult.data as AdminStats)
    : {
      totalPatients: 0,
      totalRevenue: 0,
      totalExpenses: 0,
      checkedIn: 0,
      booked: 0,
    }

  return (
    <DashboardContent
      stats={adminStats}
      upcomingAppointments={upcomingAppointments}
      recentReports={recentReports}
      lowStockItems={lowStockItems}
      birthdaysAndFollowups={birthdaysAndFollowups}
      overduePayments={overduePayments}
    />
  )
}
