'use server'

import { db } from '@/lib/db'
import { dailyReports, user, inventory, products, sales } from '@/lib/db/schema'
import { eq, desc, sql } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { checkPermission, getCurrentUser } from '@/lib/rbac'
import { MODULES, ACTIONS } from '@/lib/modules'
import { logError, logger } from '@/lib/logger'

const MODULE = MODULES.REPORTS

export async function getDailyReports() {
  const currentUser = await getCurrentUser()
  if (!currentUser) return { error: 'Not authenticated' }

  if (!(await checkPermission(currentUser.id, MODULE, ACTIONS.READ))) {
    return { error: 'Unauthorized' }
  }

  try {
    // Use JOIN instead of N+1 queries
    const reports = await db.query.dailyReports.findMany({
      orderBy: [desc(dailyReports.reportDate)],
      with: {
        submittedBy: {
          columns: {
            name: true,
            email: true,
          },
        },
      },
    })

    return { success: true, data: reports }
  } catch (error) {
    logError(error, { userId: currentUser.id })
    return { error: 'Failed to fetch reports' }
  }
}

export async function createDailyReport(data: {
  reportDate: Date
  checkedInCount: number
  newPatientsCount: number
  totalPayments: number
  totalExpenses: number
  balances: Array<{ method: string; amount: number }>
  inventoryUsed: Array<{ id: string; quantity: number }>
  productsSold: Array<{ id: string; quantity: number }>
  additionalNote?: string
}) {
  const currentUser = await getCurrentUser()
  if (!currentUser) return { error: 'Not authenticated' }

  if (!(await checkPermission(currentUser.id, MODULE, ACTIONS.CREATE))) {
    return { error: 'Unauthorized' }
  }

  try {
    // Use a transaction to ensure all operations succeed or fail together
    const newReport = await db.transaction(async (tx) => {
      // Update inventory stock quantities
      for (const item of data.inventoryUsed) {
        if (item.quantity > 0) {
          // Check if inventory item exists and has sufficient stock
          const inventoryItem = await tx.query.inventory.findFirst({
            where: eq(inventory.id, item.id),
            columns: {
              id: true,
              name: true,
              stockQuantity: true,
            },
          })

          if (!inventoryItem) {
            throw new Error(`Inventory item with ID ${item.id} not found`)
          }

          if (inventoryItem.stockQuantity < item.quantity) {
            throw new Error(
              `Insufficient stock for ${inventoryItem.name}. Available: ${inventoryItem.stockQuantity}, Required: ${item.quantity}`
            )
          }

          // Decrease inventory stock
          await tx
            .update(inventory)
            .set({
              stockQuantity: sql`${inventory.stockQuantity} - ${item.quantity}`,
              updatedAt: new Date(),
            })
            .where(eq(inventory.id, item.id))
        }
      }

      // Update product stock quantities and create sales records
      for (const item of data.productsSold) {
        if (item.quantity > 0) {
          // Check if product exists and has sufficient stock
          const product = await tx.query.products.findFirst({
            where: eq(products.id, item.id),
          })

          if (!product) {
            throw new Error(`Product with ID ${item.id} not found`)
          }

          if (product.stockQuantity < item.quantity) {
            throw new Error(
              `Insufficient stock for ${product.name}. Available: ${product.stockQuantity}, Required: ${item.quantity}`
            )
          }

          // Create sales record
          const unitPrice = product.price || 0 // Selling price per item in cents
          const costPrice = product.costPrice || 0 // Cost price per item in cents
          const totalAmount = unitPrice * item.quantity
          const profit = (unitPrice - costPrice) * item.quantity

          await tx.insert(sales).values({
            productId: item.id,
            quantity: item.quantity,
            unitPrice: unitPrice,
            costPrice: costPrice,
            totalAmount: totalAmount,
            profit: profit,
            saleDate: data.reportDate, // Use report date as sale date
          })

          // Decrease product stock
          await tx
            .update(products)
            .set({
              stockQuantity: sql`${products.stockQuantity} - ${item.quantity}`,
              updatedAt: new Date(),
            })
            .where(eq(products.id, item.id))
        }
      }

      // Create the daily report
      const [report] = await tx
        .insert(dailyReports)
        .values({
          reportDate: data.reportDate,
          checkedInCount: data.checkedInCount,
          newPatientsCount: data.newPatientsCount,
          totalPayments: data.totalPayments,
          totalExpenses: data.totalExpenses,
          balances: data.balances,
          inventoryUsed: data.inventoryUsed,
          productsSold: data.productsSold,
          additionalNote: data.additionalNote || null,
          submittedById: currentUser.id,
        })
        .returning()

      return report
    })

    revalidatePath('/reports')
    revalidatePath('/inventory')
    revalidatePath('/products')
    revalidatePath('/sales')

    logger.info(
      {
        userId: currentUser.id,
        action: 'create_daily_report',
        reportId: newReport.id,
        inventoryUpdated: data.inventoryUsed.length,
        productsUpdated: data.productsSold.length,
        salesCreated: data.productsSold.filter((p) => p.quantity > 0).length,
      },
      'Daily report created, stock updated, and sales recorded'
    )

    return { success: true, data: newReport }
  } catch (error) {
    logError(error, {
      userId: currentUser.id,
      action: 'create_daily_report',
      data,
    })

    // Return a user-friendly error message
    const errorMessage = error instanceof Error ? error.message : 'Failed to create report'
    return { error: errorMessage }
  }
}

export async function getDailyReportById(id: string) {
  const currentUser = await getCurrentUser()
  if (!currentUser) return { error: 'Not authenticated' }

  if (!(await checkPermission(currentUser.id, MODULE, ACTIONS.READ))) {
    return { error: 'Unauthorized' }
  }

  try {
    const report = await db.query.dailyReports.findFirst({
      where: eq(dailyReports.id, id),
    })

    if (!report) {
      return { error: 'Report not found' }
    }

    // Fetch user data for submittedBy
    const submittedByUser = await db.query.user.findFirst({
      where: eq(user.id, report.submittedById),
      columns: {
        name: true,
        email: true,
      },
    })

    const data = {
      ...report,
      submittedBy: submittedByUser
        ? {
            name: submittedByUser.name ?? null,
            email: submittedByUser.email ?? null,
          }
        : undefined,
    }

    return { success: true, data }
  } catch (error) {
    console.error('Error fetching report:', error)
    return { error: 'Failed to fetch report' }
  }
}

export async function deleteDailyReport(id: string) {
  const currentUser = await getCurrentUser()
  if (!currentUser) return { error: 'Not authenticated' }

  if (!(await checkPermission(currentUser.id, MODULE, ACTIONS.DELETE))) {
    return { error: 'Unauthorized' }
  }

  try {
    await db.delete(dailyReports).where(eq(dailyReports.id, id))
    revalidatePath('/reports')
    return { success: true }
  } catch (error) {
    console.error('Error deleting report:', error)
    return { error: 'Failed to delete report' }
  }
}
