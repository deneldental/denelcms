
import { config } from 'dotenv'
config({ path: '.env.local' })
import { db } from '@/lib/db'
import { user, account } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
// @ts-ignore
import { hash } from 'bcryptjs'

async function resetAdminPassword() {
    console.log('🔄 Resetting admin password...')

    const email = 'admin@example.com'
    const password = 'password123'
    const hashedPassword = await hash(password, 10)

    // 1. Check if user exists
    const existingUser = await db.query.user.findFirst({
        where: eq(user.email, email),
    })

    if (!existingUser) {
        console.error('❌ Admin user not found! Please run the seed script first.')
        process.exit(1)
    }

    console.log(`👤 Found user: ${existingUser.name} (${existingUser.id})`)

    // 2. Check for existing account
    const existingAccount = await db.query.account.findFirst({
        where: eq(account.userId, existingUser.id),
    })

    if (existingAccount) {
        console.log('📝 Updating existing account password...')
        await db
            .update(account)
            .set({
                password: hashedPassword,
                updatedAt: new Date(),
            })
            .where(eq(account.id, existingAccount.id))
    } else {
        console.log('➕ Creating new account record...')
        await db.insert(account).values({
            id: crypto.randomUUID(),
            accountId: existingUser.id,
            providerId: 'credential',
            userId: existingUser.id,
            password: hashedPassword,
            createdAt: new Date(),
            updatedAt: new Date(),
        })
    }

    console.log('✅ Admin password reset successfully to: ' + password)
}

resetAdminPassword()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .then(() => {
        process.exit(0)
    })
