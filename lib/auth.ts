import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { db } from './db' // Adjust path if needed
import { nextCookies } from 'better-auth/next-js'
import { admin } from 'better-auth/plugins'

import * as schema from './db/schema'

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema,
  }),
  emailAndPassword: {
    enabled: true,
  },
  plugins: [nextCookies(), admin()],
})
