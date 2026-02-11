import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { getCurrentUser } from '@/lib/rbac'
import { ROLES } from '@/lib/modules'
import { db } from '@/lib/db'
import { user } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { logError, logger } from '@/lib/logger'

export async function GET() {
  try {
    // Authentication check
    const session = await auth.api.getSession({
      headers: await headers(),
    })

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Authorization check - Only admins can seed
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const dbUser = await db.query.user.findFirst({
      where: eq(user.id, currentUser.id),
      with: {
        role: true,
      },
    })

    if (!dbUser?.role || dbUser.role.id !== ROLES.ADMIN) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    logger.info({ userId: currentUser.id }, 'Seed endpoint called by admin')

    // Add your seeding logic here using Drizzle
    // Example: await db.insert(someTable).values([...])

    return NextResponse.json(
      {
        message: 'Seed endpoint ready. Add your seeding logic here.',
      },
      { status: 200 }
    )
  } catch (error) {
    logError(error, { endpoint: '/api/seed' })
    return NextResponse.json(
      {
        message: 'Error in seed endpoint',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
