import { drizzle } from 'drizzle-orm/node-postgres'
import pg from 'pg'
import { DEFAULT_POOL_SIZE, DEFAULT_IDLE_TIMEOUT, DEFAULT_CONNECTION_TIMEOUT } from '../constants'
import { logger } from '../logger'

import * as schema from './schema'

if (!process.env.DATABASE_URL) {
  console.warn('DATABASE_URL is not defined. Using mock connection string for build.')
}

const globalForDb = globalThis as unknown as {
  pool: pg.Pool | undefined
}

const pool =
  globalForDb.pool ??
  new pg.Pool({
    connectionString: process.env.DATABASE_URL || 'postgres://mock:mock@localhost:5432/mock',
    max: DEFAULT_POOL_SIZE,
    idleTimeoutMillis: DEFAULT_IDLE_TIMEOUT,
    connectionTimeoutMillis: DEFAULT_CONNECTION_TIMEOUT,
  })

// Only attach listeners if creating a new pool to avoid duplicate listeners on hot reload
if (!globalForDb.pool) {
  // Log pool errors
  pool.on('error', (err) => {
    logger.error({ err }, 'Unexpected database pool error')
  })

  // Log when pool is connected
  pool.on('connect', () => {
    logger.debug('New database client connected')
  })
}

if (process.env.NODE_ENV !== 'production') {
  globalForDb.pool = pool
}

export const db = drizzle(pool, { schema })
