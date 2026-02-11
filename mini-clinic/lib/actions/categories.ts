'use server'

import { db } from '@/lib/db'
import { categories, user } from '@/lib/db/schema'
import { eq, asc } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { getCurrentUser } from '@/lib/rbac'

export async function getCategories() {
  const currentUser = await getCurrentUser()
  if (!currentUser) return { error: 'Not authenticated' }

  try {
    const data = await db
      .select()
      .from(categories)
      .where(eq(categories.isActive, true))
      .orderBy(asc(categories.name))
    return { success: true, data }
  } catch {
    return { error: 'Failed to fetch categories' }
  }
}

export async function getAllCategories() {
  const currentUser = await getCurrentUser()
  if (!currentUser) return { error: 'Not authenticated' }

  // Fetch user role from database
  const dbUser = await db.query.user.findFirst({
    where: eq(user.id, currentUser.id),
    columns: { roleId: true },
  })

  // Only admins can see all categories (including inactive)
  if (dbUser?.roleId !== 'admin') {
    return getCategories()
  }

  try {
    const data = await db.select().from(categories).orderBy(asc(categories.name))
    return { success: true, data }
  } catch {
    return { error: 'Failed to fetch categories' }
  }
}

export async function createCategory(data: { name: string }) {
  const currentUser = await getCurrentUser()
  if (!currentUser) return { error: 'Not authenticated' }

  // Fetch user role from database
  const dbUser = await db.query.user.findFirst({
    where: eq(user.id, currentUser.id),
    columns: { roleId: true },
  })

  if (dbUser?.roleId !== 'admin') {
    return { error: 'Unauthorized: Only admins can manage categories' }
  }

  try {
    const [newItem] = await db
      .insert(categories)
      .values({
        name: data.name.toLowerCase().trim(),
      })
      .returning()
    revalidatePath('/settings')
    return { success: true, data: newItem }
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === '23505') {
      // Unique constraint violation
      return { error: 'Category with this name already exists' }
    }
    return { error: 'Failed to create category' }
  }
}

export async function updateCategory(id: string, data: Partial<typeof categories.$inferInsert>) {
  const currentUser = await getCurrentUser()
  if (!currentUser) return { error: 'Not authenticated' }

  // Fetch user role from database
  const dbUser = await db.query.user.findFirst({
    where: eq(user.id, currentUser.id),
    columns: { roleId: true },
  })

  if (dbUser?.roleId !== 'admin') {
    return { error: 'Unauthorized: Only admins can manage categories' }
  }

  try {
    await db
      .update(categories)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(categories.id, id))
    revalidatePath('/settings')
    return { success: true }
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === '23505') {
      return { error: 'Category with this name already exists' }
    }
    return { error: 'Failed to update category' }
  }
}

export async function deleteCategory(id: string) {
  const currentUser = await getCurrentUser()
  if (!currentUser) return { error: 'Not authenticated' }

  // Fetch user role from database
  const dbUser = await db.query.user.findFirst({
    where: eq(user.id, currentUser.id),
    columns: { roleId: true },
  })

  if (dbUser?.roleId !== 'admin') {
    return { error: 'Unauthorized: Only admins can manage categories' }
  }

  try {
    await db.delete(categories).where(eq(categories.id, id))
    revalidatePath('/settings')
    return { success: true }
  } catch {
    return { error: 'Failed to delete category' }
  }
}
