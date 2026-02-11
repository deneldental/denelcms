import { Pool } from 'pg'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

async function addUnitColumn() {
  try {
    const client = await pool.connect()
    console.log('Adding unit column to products table...')

    const result = await client.query(`
            ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "unit" text;
        `)

    console.log('Unit column added successfully!', result)
    client.release()
    await pool.end()
  } catch (error) {
    console.error('Error adding unit column:', error)
    process.exit(1)
  }
}

addUnitColumn()
