'use server'

import { db } from '@/lib/db'
import { expenseCategories, user } from '@/lib/db/schema'
import { eq, asc } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { getCurrentUser } from '@/lib/rbac'

export async function getExpenseCategories() {
  const currentUser = await getCurrentUser()
  if (!currentUser) return { error: 'Not authenticated' }

  try {
    const data = await db
      .select()
      .from(expenseCategories)
      .where(eq(expenseCategories.isActive, true))
      .orderBy(expenseCategories.name)
    return { success: true, data }
  } catch (error) {
    console.error('Error fetching expense categories:', error)
    return { error: `Failed to fetch expense categories: ${error instanceof Error ? error.message : String(error)}` }
  }
}

export async function getAllExpenseCategories() {
  const currentUser = await getCurrentUser()
  if (!currentUser) return { error: 'Not authenticated' }

  // Fetch user role from database
  const dbUser = await db.query.user.findFirst({
    where: eq(user.id, currentUser.id),
    columns: { roleId: true },
  })

  // Only admins can see all expense categories (including inactive)
  if (dbUser?.roleId !== 'admin') {
    return getExpenseCategories()
  }

  try {
    const data = await db.select().from(expenseCategories).orderBy(asc(expenseCategories.name))
    return { success: true, data }
  } catch (error) {
    console.error('Error fetching all expense categories:', error)
    return { error: `Failed to fetch expense categories: ${error instanceof Error ? error.message : String(error)}` }
  }
}

export async function createExpenseCategory(data: { name: string; displayName?: string }) {
  const currentUser = await getCurrentUser()
  if (!currentUser) return { error: 'Not authenticated' }

  // Fetch user role from database
  const dbUser = await db.query.user.findFirst({
    where: eq(user.id, currentUser.id),
    columns: { roleId: true },
  })

  if (dbUser?.roleId !== 'admin') {
    return { error: 'Unauthorized: Only admins can manage expense categories' }
  }

  try {
    const [newItem] = await db
      .insert(expenseCategories)
      .values({
        name: data.name.toLowerCase().trim(),
        displayName: data.displayName?.trim() || null,
      })
      .returning()
    revalidatePath('/settings')
    revalidatePath('/expenses')
    return { success: true, data: newItem }
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === '23505') {
      // Unique constraint violation
      return { error: 'Expense category with this name already exists' }
    }
    return { error: 'Failed to create expense category' }
  }
}

export async function updateExpenseCategory(
  id: string,
  data: Partial<typeof expenseCategories.$inferInsert>
) {
  const currentUser = await getCurrentUser()
  if (!currentUser) return { error: 'Not authenticated' }

  // Fetch user role from database
  const dbUser = await db.query.user.findFirst({
    where: eq(user.id, currentUser.id),
    columns: { roleId: true },
  })

  if (dbUser?.roleId !== 'admin') {
    return { error: 'Unauthorized: Only admins can manage expense categories' }
  }

  try {
    await db
      .update(expenseCategories)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(expenseCategories.id, id))
    revalidatePath('/settings')
    revalidatePath('/expenses')
    return { success: true }
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === '23505') {
      return { error: 'Expense category with this name already exists' }
    }
    return { error: 'Failed to update expense category' }
  }
}

export async function deleteExpenseCategory(id: string) {
  const currentUser = await getCurrentUser()
  if (!currentUser) return { error: 'Not authenticated' }

  // Fetch user role from database
  const dbUser = await db.query.user.findFirst({
    where: eq(user.id, currentUser.id),
    columns: { roleId: true },
  })

  if (dbUser?.roleId !== 'admin') {
    return { error: 'Unauthorized: Only admins can manage expense categories' }
  }

  try {
    await db.delete(expenseCategories).where(eq(expenseCategories.id, id))
    revalidatePath('/settings')
    revalidatePath('/expenses')
    return { success: true }
  } catch {
    return { error: 'Failed to delete expense category' }
  }
}
