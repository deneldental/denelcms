import { validateEnv } from './env'
import { logger } from './logger'

/**
 * Validates environment and performs startup checks
 * Should be called once when the application starts
 */
export function performStartupChecks() {
  try {
    // Validate environment variables
    const env = validateEnv()
    logger.info('Environment validation passed')

    // Check database connection
    if (!env.DATABASE_URL) {
      throw new Error('DATABASE_URL is not defined')
    }

    // Warn about missing optional configs
    if (!env.HUBTEL_CLIENT_ID || !env.HUBTEL_CLIENT_SECRET) {
      logger.warn('Hubtel SMS credentials not configured - SMS features will be unavailable')
    }

    if (!env.REDIS_URL) {
      logger.info('Redis not configured - using in-memory cache')
    }

    logger.info({ nodeEnv: env.NODE_ENV }, 'Application startup checks completed successfully')

    return { success: true }
  } catch (error) {
    logger.fatal({ err: error }, 'Startup checks failed')
    throw error
  }
}
