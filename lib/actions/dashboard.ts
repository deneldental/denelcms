'use server'

import { db } from '@/lib/db'
import {
  patients,
  payments,
  expenses,
  appointments,
  dailyReports,
  inventory,
  products,
  orthoConsentForms,
  medicalRecords,
} from '@/lib/db/schema'
import { eq, gte, lte, and, sql, or, desc, asc } from 'drizzle-orm'
import { getCurrentUser } from '@/lib/rbac'
import { startOfDay, endOfDay, subDays, addDays, isSameDay } from 'date-fns'
import { logError } from '@/lib/logger'

export async function getDashboardStats() {
  const currentUser = await getCurrentUser()
  if (!currentUser) return { error: 'Not authenticated' }

  try {
    const now = new Date()
    const thirtyDaysAgo = subDays(now, 30)
    const startDate = startOfDay(thirtyDaysAgo)
    const endDate = endOfDay(now)

    // Total patients count
    const totalPatientsResult = await db
      .select({ count: sql<number>`cast(count(*) as integer)` })
      .from(patients)

    // Total revenue (last 30 days)
    const totalRevenueResult = await db
      .select({
        total: sql<number>`cast(coalesce(sum(${payments.amount}), 0) as integer)`,
      })
      .from(payments)
      .where(
        and(
          gte(payments.createdAt, startDate),
          lte(payments.createdAt, endDate),
          eq(payments.status, 'completed')
        )
      )

    // Total expenses (last 30 days)
    const totalExpensesResult = await db
      .select({
        total: sql<number>`cast(coalesce(sum(${expenses.amount}), 0) as integer)`,
      })
      .from(expenses)
      .where(and(gte(expenses.date, startDate), lte(expenses.date, endDate)))

    // Total checked-in vs booked appointments (last 30 days)
    const appointmentsStats = await db
      .select({
        status: appointments.status,
        count: sql<number>`cast(count(*) as integer)`,
      })
      .from(appointments)
      .where(and(gte(appointments.date, startDate), lte(appointments.date, endDate)))
      .groupBy(appointments.status)

    const checkedIn = appointmentsStats.find((s) => s.status === 'completed')?.count || 0
    const booked = appointmentsStats.reduce((sum, s) => {
      if (s.status === 'scheduled' || s.status === 'completed') {
        return sum + s.count
      }
      return sum
    }, 0)

    return {
      success: true,
      data: {
        totalPatients: totalPatientsResult[0]?.count || 0,
        totalRevenue: totalRevenueResult[0]?.total || 0,
        totalExpenses: totalExpensesResult[0]?.total || 0,
        checkedIn,
        booked,
      },
    }
  } catch (error) {
    logError(error, { userId: currentUser.id, action: 'get_dashboard_stats' })
    return { error: 'Failed to fetch dashboard stats' }
  }
}

/**
 * Get doctor-specific dashboard stats
 */
export async function getDoctorDashboardStats() {
  const currentUser = await getCurrentUser()
  if (!currentUser) return { error: 'Not authenticated' }

  try {
    const now = new Date()
    const todayStart = startOfDay(now)
    const todayEnd = endOfDay(now)

    // Total ortho patients count
    const totalOrthoPatientsResult = await db
      .select({ count: sql<number>`cast(count(*) as integer)` })
      .from(patients)
      .where(eq(patients.isOrtho, true))

    // Patients with signed consent forms
    const signedConsentFormsResult = await db
      .select({ count: sql<number>`cast(count(*) as integer)` })
      .from(orthoConsentForms)
      .where(eq(orthoConsentForms.status, 'signed'))

    // Total medical records count
    const totalMedicalRecordsResult = await db
      .select({ count: sql<number>`cast(count(*) as integer)` })
      .from(medicalRecords)

    // Total checked-in vs booked appointments for today
    const todayAppointmentsStats = await db
      .select({
        status: appointments.status,
        count: sql<number>`cast(count(*) as integer)`,
      })
      .from(appointments)
      .where(and(gte(appointments.date, todayStart), lte(appointments.date, todayEnd)))
      .groupBy(appointments.status)

    const todayCheckedIn = todayAppointmentsStats.find((s) => s.status === 'completed')?.count || 0
    const todayBooked = todayAppointmentsStats.reduce((sum, s) => {
      if (s.status === 'scheduled' || s.status === 'completed') {
        return sum + s.count
      }
      return sum
    }, 0)

    return {
      success: true,
      data: {
        totalOrthoPatients: totalOrthoPatientsResult[0]?.count || 0,
        signedConsentForms: signedConsentFormsResult[0]?.count || 0,
        totalMedicalRecords: totalMedicalRecordsResult[0]?.count || 0,
        todayCheckedIn,
        todayBooked,
      },
    }
  } catch (error) {
    logError(error, { userId: currentUser.id, action: 'get_doctor_dashboard_stats' })
    return { error: 'Failed to fetch doctor dashboard statistics' }
  }
}

/**
 * Get receptionist-specific dashboard stats (focused on today)
 */
export async function getReceptionistDashboardStats() {
  const currentUser = await getCurrentUser()
  if (!currentUser) return { error: 'Not authenticated' }

  try {
    const now = new Date()
    const todayStart = startOfDay(now)
    const todayEnd = endOfDay(now)

    // Total patients count (all time)
    const totalPatientsResult = await db
      .select({ count: sql<number>`cast(count(*) as integer)` })
      .from(patients)

    // Total payments for today
    const todayPaymentsResult = await db
      .select({
        total: sql<number>`cast(coalesce(sum(${payments.amount}), 0) as integer)`,
      })
      .from(payments)
      .where(
        and(
          gte(payments.createdAt, todayStart),
          lte(payments.createdAt, todayEnd),
          eq(payments.status, 'completed')
        )
      )

    // Total expenses for today
    const todayExpensesResult = await db
      .select({
        total: sql<number>`cast(coalesce(sum(${expenses.amount}), 0) as integer)`,
      })
      .from(expenses)
      .where(and(gte(expenses.date, todayStart), lte(expenses.date, todayEnd)))

    // Total checked-in vs booked appointments for today
    const todayAppointmentsStats = await db
      .select({
        status: appointments.status,
        count: sql<number>`cast(count(*) as integer)`,
      })
      .from(appointments)
      .where(and(gte(appointments.date, todayStart), lte(appointments.date, todayEnd)))
      .groupBy(appointments.status)

    const todayCheckedIn = todayAppointmentsStats.find((s) => s.status === 'completed')?.count || 0
    const todayBooked = todayAppointmentsStats.reduce((sum, s) => {
      if (s.status === 'scheduled' || s.status === 'completed') {
        return sum + s.count
      }
      return sum
    }, 0)

    return {
      success: true,
      data: {
        totalPatients: totalPatientsResult[0]?.count || 0,
        todayPayments: todayPaymentsResult[0]?.total || 0,
        todayExpenses: todayExpensesResult[0]?.total || 0,
        todayCheckedIn,
        todayBooked,
      },
    }
  } catch (error) {
    logError(error, { userId: currentUser.id, action: 'get_receptionist_dashboard_stats' })
    return { error: 'Failed to fetch receptionist dashboard statistics' }
  }
}

export async function getUpcomingAppointments(limit = 10) {
  const currentUser = await getCurrentUser()
  if (!currentUser) return { error: 'Not authenticated' }

  try {
    const now = new Date()

    const upcomingAppointments = await db.query.appointments.findMany({
      where: and(
        gte(appointments.date, now),
        or(eq(appointments.status, 'scheduled'), eq(appointments.status, 'completed'))
      ),
      orderBy: [asc(appointments.date)],
      limit,
      with: {
        patient: {
          columns: {
            id: true,
            name: true,
            phone: true,
            profileImage: true,
          },
        },
        doctor: {
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
        },
      },
    })

    return { success: true, data: upcomingAppointments }
  } catch (error) {
    logError(error, { userId: currentUser.id, action: 'get_upcoming_appointments' })
    return { error: 'Failed to fetch upcoming appointments' }
  }
}

export async function getRecentReports(limit = 7) {
  const currentUser = await getCurrentUser()
  if (!currentUser) return { error: 'Not authenticated' }

  try {
    const recentReports = await db.query.dailyReports.findMany({
      orderBy: [desc(dailyReports.reportDate)],
      limit,
      with: {
        submittedBy: {
          columns: {
            name: true,
            email: true,
          },
        },
      },
    })

    return { success: true, data: recentReports }
  } catch (error) {
    logError(error, { userId: currentUser.id, action: 'get_recent_reports' })
    return { error: 'Failed to fetch recent reports' }
  }
}

export async function getLowStockItems(limit = 10) {
  const currentUser = await getCurrentUser()
  if (!currentUser) return { error: 'Not authenticated' }

  try {
    // Get low stock inventory items
    const lowStockInventory = await db
      .select({
        id: inventory.id,
        name: inventory.name,
        stockQuantity: inventory.stockQuantity,
        reorderLevel: inventory.reorderLevel,
        unit: inventory.unit,
        type: sql<string>`'inventory'`,
      })
      .from(inventory)
      .where(sql`${inventory.stockQuantity} <= ${inventory.reorderLevel}`)
      .orderBy(asc(inventory.stockQuantity))
      .limit(limit)

    // Get low stock products
    const lowStockProducts = await db
      .select({
        id: products.id,
        name: products.name,
        stockQuantity: products.stockQuantity,
        reorderLevel: products.reorderLevel,
        unit: products.unit,
        type: sql<string>`'product'`,
      })
      .from(products)
      .where(sql`${products.stockQuantity} <= ${products.reorderLevel}`)
      .orderBy(asc(products.stockQuantity))
      .limit(limit)

    // Combine and sort by stock quantity
    const allLowStock = [...lowStockInventory, ...lowStockProducts]
      .sort((a, b) => a.stockQuantity - b.stockQuantity)
      .slice(0, limit)

    return { success: true, data: allLowStock }
  } catch (error) {
    logError(error, { userId: currentUser.id, action: 'get_low_stock_items' })
    return { error: 'Failed to fetch low stock items' }
  }
}

export async function getRecentMedicalRecords(limit = 10) {
  const currentUser = await getCurrentUser()
  if (!currentUser) return { error: 'Not authenticated' }

  try {
    const recentRecords = await db.query.medicalRecords.findMany({
      orderBy: [desc(medicalRecords.createdAt)],
      limit,
      with: {
        patient: {
          columns: {
            id: true,
            name: true,
            profileImage: true,
          },
        },
        doctor: {
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
        },
      },
    })

    return { success: true, data: recentRecords }
  } catch (error) {
    logError(error, { userId: currentUser.id, action: 'get_recent_medical_records' })
    return { error: 'Failed to fetch recent medical records' }
  }
}

export async function getBirthdaysAndFollowups() {
  const currentUser = await getCurrentUser()
  if (!currentUser) return { error: 'Not authenticated' }

  try {
    const now = new Date()
    const sevenDaysFromNow = addDays(now, 7)

    // Get patients with birthdays in the next 7 days
    const allPatients = await db
      .select({
        id: patients.id,
        name: patients.name,
        phone: patients.phone,
        dob: patients.dob,
        profileImage: patients.profileImage,
      })
      .from(patients)

    // Filter birthdays in the next 7 days (checking month and day only)
    const upcomingBirthdays = allPatients
      .filter((patient) => {
        if (!patient.dob) return false

        const dob = new Date(patient.dob)
        const currentYear = now.getFullYear()

        // Create a birthday date for this year
        const birthdayThisYear = new Date(currentYear, dob.getMonth(), dob.getDate())

        // If birthday has passed this year, check next year
        if (birthdayThisYear < now) {
          const birthdayNextYear = new Date(currentYear + 1, dob.getMonth(), dob.getDate())
          return birthdayNextYear >= now && birthdayNextYear <= sevenDaysFromNow
        }

        return birthdayThisYear >= now && birthdayThisYear <= sevenDaysFromNow
      })
      .map((patient) => {
        const dob = new Date(patient.dob!)
        const currentYear = now.getFullYear()
        let birthdayThisYear = new Date(currentYear, dob.getMonth(), dob.getDate())

        if (birthdayThisYear < now) {
          birthdayThisYear = new Date(currentYear + 1, dob.getMonth(), dob.getDate())
        }

        return {
          ...patient,
          type: 'birthday' as const,
          date: birthdayThisYear,
          isTomorrow: isSameDay(birthdayThisYear, addDays(now, 1)),
          isToday: isSameDay(birthdayThisYear, now),
        }
      })

    // Get upcoming appointments that need follow-up (appointments in the past 30 days that were completed)
    const followupDate = subDays(now, 30)
    const completedAppointments = await db.query.appointments.findMany({
      where: and(
        gte(appointments.date, followupDate),
        lte(appointments.date, now),
        eq(appointments.status, 'completed')
      ),
      orderBy: [desc(appointments.date)],
      limit: 10,
      with: {
        patient: {
          columns: {
            id: true,
            name: true,
            phone: true,
            profileImage: true,
          },
        },
      },
    })

    const followups = completedAppointments.map((appointment) => ({
      id: appointment.patient.id,
      name: appointment.patient.name,
      phone: appointment.patient.phone,
      profileImage: appointment.patient.profileImage,
      type: 'followup' as const,
      date: appointment.date,
      appointmentId: appointment.id,
    }))

    return {
      success: true,
      data: {
        birthdays: upcomingBirthdays,
        followups,
      },
    }
  } catch (error) {
    logError(error, { userId: currentUser.id, action: 'get_birthdays_followups' })
    return { error: 'Failed to fetch birthdays and follow-ups' }
  }
}
