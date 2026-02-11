'use server'

import { db } from '@/lib/db'
import { inventory } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { checkPermission, getCurrentUser } from '@/lib/rbac'
import { MODULES, ACTIONS } from '@/lib/modules'
import { canPerformInventoryAction } from './settings'

const MODULE = MODULES.INVENTORY

export async function getInventoryItems() {
  const currentUser = await getCurrentUser()
  if (!currentUser) return { error: 'Not authenticated' }

  if (!(await checkPermission(currentUser.id, MODULE, ACTIONS.READ)))
    return { error: 'Unauthorized' }

  try {
    const data = await db.query.inventory.findMany()
    return { success: true, data }
  } catch (error) {
    console.error('Error fetching inventory items:', error)
    return { error: error instanceof Error ? error.message : 'Failed to fetch inventory items' }
  }
}

export async function getInventoryItem(id: string) {
  const currentUser = await getCurrentUser()
  if (!currentUser) return { error: 'Not authenticated' }

  if (!(await checkPermission(currentUser.id, MODULE, ACTIONS.READ)))
    return { error: 'Unauthorized' }

  try {
    const [data] = await db.select().from(inventory).where(eq(inventory.id, id)).limit(1)
    if (!data) {
      return { error: 'Inventory item not found' }
    }
    return { success: true, data }
  } catch (error) {
    console.error('Error fetching inventory item:', error)
    return { error: error instanceof Error ? error.message : 'Failed to fetch inventory item' }
  }
}

export async function createInventoryItem(data: typeof inventory.$inferInsert) {
  const currentUser = await getCurrentUser()
  if (!currentUser) return { error: 'Not authenticated' }

  // Check lock status and permissions
  const actionCheck = await canPerformInventoryAction(ACTIONS.CREATE)
  if (!actionCheck.allowed) {
    return { error: actionCheck.reason || 'Unauthorized' }
  }

  try {
    const [newItem] = await db.insert(inventory).values(data).returning()
    revalidatePath('/inventory')
    return { success: true, data: newItem }
  } catch (error) {
    console.error('Error creating inventory item:', error)
    return { error: error instanceof Error ? error.message : 'Failed to create inventory item' }
  }
}

export async function updateInventoryItem(
  id: string,
  data: Partial<typeof inventory.$inferInsert>
) {
  const currentUser = await getCurrentUser()
  if (!currentUser) return { error: 'Not authenticated' }

  // Check lock status and permissions
  const actionCheck = await canPerformInventoryAction(ACTIONS.UPDATE)
  if (!actionCheck.allowed) {
    return { error: actionCheck.reason || 'Unauthorized' }
  }

  try {
    await db.update(inventory).set(data).where(eq(inventory.id, id))
    revalidatePath('/inventory')
    revalidatePath(`/inventory/${id}`)
    return { success: true }
  } catch {
    return { error: 'Failed to update inventory item' }
  }
}

export async function deleteInventoryItem(id: string) {
  const currentUser = await getCurrentUser()
  if (!currentUser) return { error: 'Not authenticated' }

  // Check lock status and permissions
  const actionCheck = await canPerformInventoryAction(ACTIONS.DELETE)
  if (!actionCheck.allowed) {
    return { error: actionCheck.reason || 'Unauthorized' }
  }

  try {
    await db.delete(inventory).where(eq(inventory.id, id))
    revalidatePath('/inventory')
    return { success: true }
  } catch {
    return { error: 'Failed to delete inventory item' }
  }
}
