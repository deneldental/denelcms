'use server'

import { db } from '@/lib/db'
import { products } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { checkPermission, getCurrentUser } from '@/lib/rbac'
import { MODULES, ACTIONS } from '@/lib/modules'
import { canPerformProductAction } from './settings'

const MODULE = MODULES.PRODUCTS

export async function getProducts() {
  const currentUser = await getCurrentUser()
  if (!currentUser) return { error: 'Not authenticated' }

  if (!(await checkPermission(currentUser.id, MODULE, ACTIONS.READ)))
    return { error: 'Unauthorized' }

  try {
    const data = await db.query.products.findMany()
    return { success: true, data }
  } catch (error) {
    console.error('Error fetching products:', error)
    return { error: error instanceof Error ? error.message : 'Failed to fetch products' }
  }
}

export async function getProduct(id: string) {
  const currentUser = await getCurrentUser()
  if (!currentUser) return { error: 'Not authenticated' }

  if (!(await checkPermission(currentUser.id, MODULE, ACTIONS.READ)))
    return { error: 'Unauthorized' }

  try {
    const [data] = await db.select().from(products).where(eq(products.id, id)).limit(1)
    if (!data) {
      return { error: 'Product not found' }
    }
    return { success: true, data }
  } catch (error) {
    console.error('Error fetching product:', error)
    return { error: error instanceof Error ? error.message : 'Failed to fetch product' }
  }
}

export async function createProduct(data: typeof products.$inferInsert) {
  const currentUser = await getCurrentUser()
  if (!currentUser) return { error: 'Not authenticated' }

  // Check lock status and permissions
  const actionCheck = await canPerformProductAction(ACTIONS.CREATE)
  if (!actionCheck.allowed) {
    return { error: actionCheck.reason || 'Unauthorized' }
  }

  try {
    // Ensure quantityPerPack has a default value if not provided
    // Handle costPrice: convert empty string/0 to null, keep null as null
    // Handle potential string input from forms before type checking
    interface ProductDataInput {
      costPrice?: number | string | null
      quantityPerPack?: number
      [key: string]: unknown
    }
    const inputData = data as ProductDataInput

    let costPrice: number | null = null
    const rawCostPrice = inputData.costPrice
    if (rawCostPrice !== null && rawCostPrice !== undefined) {
      if (typeof rawCostPrice === 'string') {
        const trimmed = rawCostPrice.trim()
        if (trimmed !== '') {
          const parsed = parseFloat(trimmed)
          costPrice = isNaN(parsed) || parsed === 0 ? null : parsed
        }
      } else if (typeof rawCostPrice === 'number' && rawCostPrice !== 0) {
        costPrice = rawCostPrice
      }
    }

    const productData: typeof products.$inferInsert = {
      ...data,
      quantityPerPack: data.quantityPerPack ?? 1,
      costPrice,
    }

    const [newItem] = await db.insert(products).values(productData).returning()
    revalidatePath('/products')
    return { success: true, data: newItem }
  } catch (error) {
    console.error('Error creating product:', error)
    return { error: error instanceof Error ? error.message : 'Failed to create product' }
  }
}

export async function updateProduct(id: string, data: Partial<typeof products.$inferInsert>) {
  const currentUser = await getCurrentUser()
  if (!currentUser) return { error: 'Not authenticated' }

  // Check lock status and permissions
  const actionCheck = await canPerformProductAction(ACTIONS.UPDATE)
  if (!actionCheck.allowed) {
    return { error: actionCheck.reason || 'Unauthorized' }
  }

  try {
    await db.update(products).set(data).where(eq(products.id, id))
    revalidatePath('/products')
    revalidatePath(`/products/${id}`)
    return { success: true }
  } catch {
    return { error: 'Failed to update product' }
  }
}

export async function deleteProduct(id: string) {
  const currentUser = await getCurrentUser()
  if (!currentUser) return { error: 'Not authenticated' }

  // Check lock status and permissions
  const actionCheck = await canPerformProductAction(ACTIONS.DELETE)
  if (!actionCheck.allowed) {
    return { error: actionCheck.reason || 'Unauthorized' }
  }

  try {
    await db.delete(products).where(eq(products.id, id))
    revalidatePath('/products')
    return { success: true }
  } catch {
    return { error: 'Failed to delete product' }
  }
}
