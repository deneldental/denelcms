'use server'

import { db } from '@/lib/db'
import { sales, products } from '@/lib/db/schema'
import { eq, and, gte, lte, desc, SQL } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { checkPermission, getCurrentUser } from '@/lib/rbac'
import { MODULES, ACTIONS } from '@/lib/modules'
import { startOfDay, endOfDay } from 'date-fns'
import { createSaleSchema, CreateSaleInput } from '@/lib/validation/sales'
import { logger, logError } from '@/lib/logger'

const MODULE = MODULES.INVENTORY // Using inventory module for sales

export async function createSale(input: CreateSaleInput) {
  const currentUser = await getCurrentUser()
  if (!currentUser) return { error: 'Not authenticated' }

  if (!(await checkPermission(currentUser.id, MODULE, ACTIONS.CREATE)))
    return { error: 'Unauthorized' }

  // Validate input
  const validation = createSaleSchema.safeParse(input)
  if (!validation.success) {
    const errors = validation.error.issues.map((e) => e.message).join(', ')
    return { error: `Validation failed: ${errors}` }
  }

  const data = validation.data

  try {
    // Use transaction to ensure atomicity
    const result = await db.transaction(async (tx) => {
      // Get product to verify stock
      const [product] = await tx
        .select()
        .from(products)
        .where(eq(products.id, data.productId))
        .limit(1)
      if (!product) {
        throw new Error('Product not found')
      }

      // Calculate available individual items
      const quantityPerPack = product.quantityPerPack || 1
      const availableItems = product.stockQuantity * quantityPerPack

      // Verify we have enough individual items in stock
      if (availableItems < data.quantity) {
        throw new Error('Insufficient stock')
      }

      // Calculate how many packs need to be opened (round up)
      const packsNeeded = Math.ceil(data.quantity / quantityPerPack)
      const newStockQuantity = product.stockQuantity - packsNeeded

      const totalAmount = data.unitPrice * data.quantity
      const profit = (data.unitPrice - data.costPrice) * data.quantity

      // Create sale record
      const [newSale] = await tx
        .insert(sales)
        .values({
          productId: data.productId,
          quantity: data.quantity, // Number of individual items sold
          unitPrice: data.unitPrice, // Price per single item
          costPrice: data.costPrice, // Cost per single item
          totalAmount,
          profit,
        })
        .returning()

      // Update product stock (reduce by number of packs opened)
      await tx
        .update(products)
        .set({ stockQuantity: newStockQuantity })
        .where(eq(products.id, data.productId))

      return newSale
    })

    logger.info(
      { saleId: result.id, productId: data.productId, quantity: data.quantity },
      'Sale created successfully'
    )
    revalidatePath('/products')
    return { success: true, data: result }
  } catch (error) {
    logError(error, { productId: data.productId, userId: currentUser.id })
    return { error: error instanceof Error ? error.message : 'Failed to create sale' }
  }
}

export async function getSales(startDate?: Date, endDate?: Date) {
  const currentUser = await getCurrentUser()
  if (!currentUser) return { error: 'Not authenticated' }

  if (!(await checkPermission(currentUser.id, MODULE, ACTIONS.READ)))
    return { error: 'Unauthorized' }

  try {
    const conditions: SQL<unknown>[] = []

    if (startDate && endDate) {
      const start = startOfDay(startDate)
      const end = endOfDay(endDate)
      conditions.push(gte(sales.saleDate, start))
      conditions.push(lte(sales.saleDate, end))
    }

    const query = db
      .select({
        sale: sales,
        product: products,
      })
      .from(sales)
      .leftJoin(products, eq(sales.productId, products.id))
      .orderBy(desc(sales.saleDate))

    const data = conditions.length > 0 ? await query.where(and(...conditions)) : await query

    return { success: true, data }
  } catch (error) {
    console.error('Error fetching sales:', error)
    return { error: 'Failed to fetch sales' }
  }
}

export async function getDailySales(date: Date = new Date()) {
  const start = startOfDay(date)
  const end = endOfDay(date)
  return getSales(start, end)
}
