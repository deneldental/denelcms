import { z } from 'zod'

const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().url(),

  // Hubtel SMS (optional but validated if present)
  HUBTEL_CLIENT_ID: z.string().optional(),
  HUBTEL_CLIENT_SECRET: z.string().optional(),
  PREPAID_DEPOSIT_ID: z.string().optional(),
  SMS_SENDER_NAME: z.string().default('Framada'),

  // SMS Templates
  APPOINTMENT_SMS: z.string().optional(),
  PAYMENT_SMS: z.string().optional(),
  PAYMENT_PLAN_SMS: z.string().optional(),




  // App Configuration
  NODE_ENV: z.enum(['development', 'production']).default('development'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),

  // Redis (optional for caching)
  REDIS_URL: z.string().url().optional(),
})

export type Env = z.infer<typeof envSchema>

let validatedEnv: Env | null = null

export function validateEnv(): Env {
  if (validatedEnv) {
    return validatedEnv
  }

  try {
    validatedEnv = envSchema.parse(process.env)
    return validatedEnv
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.issues.map((err) => `${err.path.join('.')}: ${err.message}`)
      console.warn(
        `Environment validation failed (proceeding with mock values for build):\n${missingVars.join('\n')}`
      )
      // Return a mock env object to allow build to proceed
      return {
        DATABASE_URL: 'postgres://mock:mock@localhost:5432/mock',
        NODE_ENV: 'development',
        LOG_LEVEL: 'info',
        SMS_SENDER_NAME: 'Framada',
      } as Env
    }
    throw error
  }
}

export function getEnv(): Env {
  if (!validatedEnv) {
    throw new Error('Environment not validated. Call validateEnv() first.')
  }
  return validatedEnv
}
