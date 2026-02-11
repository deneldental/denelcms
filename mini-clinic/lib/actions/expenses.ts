'use server'

import { db } from '@/lib/db'
import { expenses } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { checkPermission, getCurrentUser } from '@/lib/rbac'
import { MODULES, ACTIONS } from '@/lib/modules'

const MODULE = MODULES.EXPENSES

export async function getExpenses() {
  const currentUser = await getCurrentUser()
  if (!currentUser) return { error: 'Not authenticated' }

  if (!(await checkPermission(currentUser.id, MODULE, ACTIONS.READ)))
    return { error: 'Unauthorized' }

  try {
    const data = await db.query.expenses.findMany()
    return { success: true, data }
  } catch {
    return { error: 'Failed to fetch expenses' }
  }
}

export async function createExpense(data: typeof expenses.$inferInsert) {
  const currentUser = await getCurrentUser()
  if (!currentUser) return { error: 'Not authenticated' }

  if (!(await checkPermission(currentUser.id, MODULE, ACTIONS.CREATE)))
    return { error: 'Unauthorized' }

  try {
    const [newItem] = await db.insert(expenses).values(data).returning()
    revalidatePath('/expenses')
    return { success: true, data: newItem }
  } catch (error) {
    console.error('Error creating expense:', error)
    return { error: 'Failed to create expense' }
  }
}

export async function updateExpense(id: string, data: Partial<typeof expenses.$inferInsert>) {
  const currentUser = await getCurrentUser()
  if (!currentUser) return { error: 'Not authenticated' }

  // Assuming UPDATE permission exists for Expenses
  if (!(await checkPermission(currentUser.id, MODULE, ACTIONS.UPDATE)))
    return { error: 'Unauthorized' }

  try {
    await db.update(expenses).set(data).where(eq(expenses.id, id))
    revalidatePath('/expenses')
    revalidatePath(`/expenses/${id}`)
    return { success: true }
  } catch (error) {
    console.error('Error updating expense:', error)
    return { error: 'Failed to update expense' }
  }
}

export async function deleteExpense(id: string) {
  const currentUser = await getCurrentUser()
  if (!currentUser) return { error: 'Not authenticated' }

  if (!(await checkPermission(currentUser.id, MODULE, ACTIONS.DELETE)))
    return { error: 'Unauthorized' }

  try {
    await db.delete(expenses).where(eq(expenses.id, id))
    revalidatePath('/expenses')
    return { success: true }
  } catch (error) {
    console.error('Error deleting expense:', error)
    return { error: 'Failed to delete expense' }
  }
}

export async function getExpense(id: string) {
  const currentUser = await getCurrentUser()
  if (!currentUser) return { error: 'Not authenticated' }

  if (!(await checkPermission(currentUser.id, MODULE, ACTIONS.READ)))
    return { error: 'Unauthorized' }

  try {
    const [data] = await db.select().from(expenses).where(eq(expenses.id, id)).limit(1)
    if (!data) {
      return { error: 'Expense not found' }
    }
    return { success: true, data }
  } catch (error) {
    console.error('Error fetching expense:', error)
    return { error: error instanceof Error ? error.message : 'Failed to fetch expense' }
  }
}
