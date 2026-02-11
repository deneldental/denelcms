'use server'

import { db } from '@/lib/db'
import { doctors, user } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { checkPermission, getCurrentUser } from '@/lib/rbac'
import { MODULES, ACTIONS, ROLES } from '@/lib/modules'

// Doctors module might default to 'users' permission or specific 'doctors' if added to modules.ts
const MODULE = MODULES.USERS

export async function getDoctors() {
  const currentUser = await getCurrentUser()
  if (!currentUser) return { success: false, error: 'Not authenticated' }

  // Everyone logged in should probably be able to seeing a list of doctors to book appointments?
  // Or strictly check permissions.
  const hasPermission = await checkPermission(currentUser.id, MODULE, ACTIONS.READ)
  if (!hasPermission) return { success: false, error: 'Unauthorized' }

  try {
    // Fetch users with doctor role
    const usersWithDoctorRole = await db.query.user.findMany({
      where: eq(user.roleId, ROLES.DOCTOR),
      columns: {
        id: true,
        name: true,
        email: true,
        phone: true,
        image: true,
      },
    })

    // Fetch existing doctors from the doctors table
    const existingDoctors = await db.query.doctors.findMany({
      with: {
        user: true,
      },
    })

    // Create a map of userId -> doctor entry
    const doctorMap = new Map()
    existingDoctors.forEach((d) => {
      doctorMap.set(d.userId, d)
    })

    // For users with doctor role who don't have a doctor entry, create one
    for (const userWithRole of usersWithDoctorRole) {
      if (!doctorMap.has(userWithRole.id)) {
        // Create a doctor entry for this user
        const [newDoctor] = await db
          .insert(doctors)
          .values({
            userId: userWithRole.id,
            specialty: 'General', // Default specialty
            licenseNumber: null,
            bio: null,
            contactNumber: userWithRole.phone || null,
            createdAt: new Date(),
            updatedAt: new Date(),
          })
          .returning()

        // Fetch the created doctor with user relation
        const doctorWithUser = await db.query.doctors.findFirst({
          where: eq(doctors.id, newDoctor.id),
          with: {
            user: true,
          },
        })

        if (doctorWithUser) {
          doctorMap.set(userWithRole.id, doctorWithUser)
        }
      }
    }

    // Return all doctors (both existing and newly created)
    // Add "Dr" prefix to all doctor names
    const data = Array.from(doctorMap.values()).map((doctor) => {
      if (doctor.user) {
        // Add "Dr" prefix if not already present
        const name = doctor.user.name || 'Unknown Doctor'
        const prefixedName =
          name.startsWith('Dr. ') || name.startsWith('Dr ') ? name : `Dr. ${name}`
        return {
          ...doctor,
          user: {
            ...doctor.user,
            name: prefixedName,
          },
        }
      }
      return doctor
    })

    return { success: true, data }
  } catch (error) {
    console.error('Error fetching doctors:', error)
    return { success: false, error: 'Failed to fetch doctors' }
  }
}
