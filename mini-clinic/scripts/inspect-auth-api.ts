
import { config } from 'dotenv'
config({ path: '.env.local' })
import { auth } from '@/lib/auth'

async function main() {
    console.log('API Keys:', Object.keys(auth.api))
    // @ts-ignore
    if (auth.api.admin) {
        // @ts-ignore
        console.log('Admin API Keys:', Object.keys(auth.api.admin))
    } else {
        console.log('No auth.api.admin found')
    }
}

main().catch(console.error).then(() => process.exit(0))
