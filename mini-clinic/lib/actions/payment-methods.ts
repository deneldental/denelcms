'use server'

import { db } from '@/lib/db'
import { paymentMethods, user } from '@/lib/db/schema'
import { eq, asc } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { getCurrentUser } from '@/lib/rbac'

export async function getPaymentMethods() {
  const currentUser = await getCurrentUser()
  if (!currentUser) return { error: 'Not authenticated' }

  try {
    const data = await db
      .select()
      .from(paymentMethods)
      .where(eq(paymentMethods.isActive, true))
      .orderBy(paymentMethods.name)
    return { success: true, data }
  } catch (error) {
    console.error('Error fetching payment methods:', error)
    return { error: `Failed to fetch payment methods: ${error instanceof Error ? error.message : String(error)}` }
  }
}

export async function getAllPaymentMethods() {
  const currentUser = await getCurrentUser()
  if (!currentUser) return { error: 'Not authenticated' }

  // Fetch user role from database
  const dbUser = await db.query.user.findFirst({
    where: eq(user.id, currentUser.id),
    columns: { roleId: true },
  })

  // Only admins can see all payment methods (including inactive)
  if (dbUser?.roleId !== 'admin') {
    return getPaymentMethods()
  }

  try {
    const data = await db.select().from(paymentMethods).orderBy(asc(paymentMethods.name))
    return { success: true, data }
  } catch (error) {
    console.error('Error fetching all payment methods:', error)
    return { error: `Failed to fetch payment methods: ${error instanceof Error ? error.message : String(error)}` }
  }
}

export async function createPaymentMethod(data: { name: string; displayName?: string }) {
  const currentUser = await getCurrentUser()
  if (!currentUser) return { error: 'Not authenticated' }

  // Fetch user role from database
  const dbUser = await db.query.user.findFirst({
    where: eq(user.id, currentUser.id),
    columns: { roleId: true },
  })

  if (dbUser?.roleId !== 'admin') {
    return { error: 'Unauthorized: Only admins can manage payment methods' }
  }

  try {
    const [newItem] = await db
      .insert(paymentMethods)
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
      return { error: 'Payment method with this name already exists' }
    }
    return { error: 'Failed to create payment method' }
  }
}

export async function updatePaymentMethod(
  id: string,
  data: Partial<typeof paymentMethods.$inferInsert>
) {
  const currentUser = await getCurrentUser()
  if (!currentUser) return { error: 'Not authenticated' }

  // Fetch user role from database
  const dbUser = await db.query.user.findFirst({
    where: eq(user.id, currentUser.id),
    columns: { roleId: true },
  })

  if (dbUser?.roleId !== 'admin') {
    return { error: 'Unauthorized: Only admins can manage payment methods' }
  }

  try {
    await db
      .update(paymentMethods)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(paymentMethods.id, id))
    revalidatePath('/settings')
    revalidatePath('/expenses')
    return { success: true }
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === '23505') {
      return { error: 'Payment method with this name already exists' }
    }
    return { error: 'Failed to update payment method' }
  }
}

export async function deletePaymentMethod(id: string) {
  const currentUser = await getCurrentUser()
  if (!currentUser) return { error: 'Not authenticated' }

  // Fetch user role from database
  const dbUser = await db.query.user.findFirst({
    where: eq(user.id, currentUser.id),
    columns: { roleId: true },
  })

  if (dbUser?.roleId !== 'admin') {
    return { error: 'Unauthorized: Only admins can manage payment methods' }
  }

  try {
    await db.delete(paymentMethods).where(eq(paymentMethods.id, id))
    revalidatePath('/settings')
    revalidatePath('/expenses')
    return { success: true }
  } catch {
    return { error: 'Failed to delete payment method' }
  }
}
