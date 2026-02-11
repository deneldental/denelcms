
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { user } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export async function GET() {
    const dbUrl = process.env.DATABASE_URL || 'UNDEFINED'
    const maskedDbUrl = dbUrl.substring(0, 20) + '...'

    const betterAuthSecret = process.env.BETTER_AUTH_SECRET || 'UNDEFINED'
    const maskedSecret = betterAuthSecret.substring(0, 3) + '...'

    let adminUserRaw = null
    let dbError = null

    try {
        const found = await db.query.user.findFirst({
            where: eq(user.email, 'admin@example.com')
        })
        adminUserRaw = found
    } catch (e: any) {
        dbError = e.message
    }

    return NextResponse.json({
        env: {
            DATABASE_URL_PREFIX: maskedDbUrl,
            BETTER_AUTH_SECRET_PREFIX: maskedSecret,
            NODE_ENV: process.env.NODE_ENV,
        },
        dbCheck: {
            connected: !dbError,
            error: dbError,
            adminUserFound: !!adminUserRaw,
            adminUserId: adminUserRaw?.id,
            adminRole: adminUserRaw?.role
        }
    })
}
