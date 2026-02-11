'use server'

import { cache } from '@/lib/cache'
import { getCurrentUser, checkPermission } from '@/lib/rbac'
import { MODULES, ACTIONS, ROLES } from '@/lib/modules'
import { logger, logError } from '@/lib/logger'
import { db } from '@/lib/db'
import { user } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

const PRODUCTS_LOCK_KEY = 'settings:products:locked'
const INVENTORY_LOCK_KEY = 'settings:inventory:locked'

/**
 * Check if the current user is an admin
 */
async function isAdmin(userId: string): Promise<boolean> {
  try {
    const dbUser = await db.query.user.findFirst({
      where: eq(user.id, userId),
      with: {
        role: {
          columns: {
            id: true,
          },
        },
      },
    })
    return dbUser?.role?.id === ROLES.ADMIN
  } catch (error) {
    logError(error, { userId, action: 'check_admin' })
    return false
  }
}

/**
 * Get products lock status
 */
export async function getProductsLockStatus() {
  const currentUser = await getCurrentUser()
  if (!currentUser) return { error: 'Not authenticated' }

  try {
    const isLocked = cache.get<boolean>(PRODUCTS_LOCK_KEY) ?? false
    const userIsAdmin = await isAdmin(currentUser.id)

    return {
      success: true,
      data: {
        isLocked,
        isAdmin: userIsAdmin,
      },
    }
  } catch (error) {
    logError(error, { userId: currentUser.id, action: 'get_products_lock_status' })
    return { error: 'Failed to get lock status' }
  }
}

/**
 * Set products lock status (admin only)
 */
export async function setProductsLockStatus(locked: boolean) {
  const currentUser = await getCurrentUser()
  if (!currentUser) return { error: 'Not authenticated' }

  try {
    // Only admins can change lock status
    const userIsAdmin = await isAdmin(currentUser.id)
    if (!userIsAdmin) {
      return { error: 'Only administrators can change lock status' }
    }

    // Set lock status in cache (never expires unless manually changed)
    cache.set(PRODUCTS_LOCK_KEY, locked, 365 * 24 * 60 * 60) // 1 year TTL

    logger.info(
      {
        userId: currentUser.id,
        action: locked ? 'lock_products' : 'unlock_products',
        locked,
      },
      `Products ${locked ? 'locked' : 'unlocked'}`
    )

    return { success: true, data: { isLocked: locked } }
  } catch (error) {
    logError(error, { userId: currentUser.id, action: 'set_products_lock_status', locked })
    return { error: 'Failed to update lock status' }
  }
}

/**
 * Check if user can perform action on products (considering lock status)
 * Returns true if user can perform action, false otherwise
 */
export async function canPerformProductAction(
  action: string
): Promise<{ allowed: boolean; reason?: string }> {
  const currentUser = await getCurrentUser()
  if (!currentUser) {
    return { allowed: false, reason: 'Not authenticated' }
  }

  // Check base permission first
  const hasPermission = await checkPermission(currentUser.id, MODULES.PRODUCTS, action)
  if (!hasPermission) {
    return { allowed: false, reason: 'Unauthorized' }
  }

  // Check lock status
  const isLocked = cache.get<boolean>(PRODUCTS_LOCK_KEY) ?? false

  // If not locked, allow action
  if (!isLocked) {
    return { allowed: true }
  }

  // If locked, only admins can perform create/update/delete actions
  if (action === ACTIONS.CREATE || action === ACTIONS.UPDATE || action === ACTIONS.DELETE) {
    const userIsAdmin = await isAdmin(currentUser.id)
    if (!userIsAdmin) {
      return {
        allowed: false,
        reason: 'Products are locked. Only administrators can make changes.',
      }
    }
  }

  // Allow read actions even when locked
  return { allowed: true }
}

/**
 * Get inventory lock status
 */
export async function getInventoryLockStatus() {
  const currentUser = await getCurrentUser()
  if (!currentUser) return { error: 'Not authenticated' }

  try {
    const isLocked = cache.get<boolean>(INVENTORY_LOCK_KEY) ?? false
    const userIsAdmin = await isAdmin(currentUser.id)

    return {
      success: true,
      data: {
        isLocked,
        isAdmin: userIsAdmin,
      },
    }
  } catch (error) {
    logError(error, { userId: currentUser.id, action: 'get_inventory_lock_status' })
    return { error: 'Failed to get lock status' }
  }
}

/**
 * Set inventory lock status (admin only)
 */
export async function setInventoryLockStatus(locked: boolean) {
  const currentUser = await getCurrentUser()
  if (!currentUser) return { error: 'Not authenticated' }

  try {
    // Only admins can change lock status
    const userIsAdmin = await isAdmin(currentUser.id)
    if (!userIsAdmin) {
      return { error: 'Only administrators can change lock status' }
    }

    // Set lock status in cache (never expires unless manually changed)
    cache.set(INVENTORY_LOCK_KEY, locked, 365 * 24 * 60 * 60) // 1 year TTL

    logger.info(
      {
        userId: currentUser.id,
        action: locked ? 'lock_inventory' : 'unlock_inventory',
        locked,
      },
      `Inventory ${locked ? 'locked' : 'unlocked'}`
    )

    return { success: true, data: { isLocked: locked } }
  } catch (error) {
    logError(error, { userId: currentUser.id, action: 'set_inventory_lock_status', locked })
    return { error: 'Failed to update lock status' }
  }
}

/**
 * Check if user can perform action on inventory (considering lock status)
 * Returns true if user can perform action, false otherwise
 */
export async function canPerformInventoryAction(
  action: string
): Promise<{ allowed: boolean; reason?: string }> {
  const currentUser = await getCurrentUser()
  if (!currentUser) {
    return { allowed: false, reason: 'Not authenticated' }
  }

  // Check base permission first
  const hasPermission = await checkPermission(currentUser.id, MODULES.INVENTORY, action)
  if (!hasPermission) {
    return { allowed: false, reason: 'Unauthorized' }
  }

  // Check lock status
  const isLocked = cache.get<boolean>(INVENTORY_LOCK_KEY) ?? false

  // If not locked, allow action
  if (!isLocked) {
    return { allowed: true }
  }

  // If locked, only admins can perform create/update/delete actions
  if (action === ACTIONS.CREATE || action === ACTIONS.UPDATE || action === ACTIONS.DELETE) {
    const userIsAdmin = await isAdmin(currentUser.id)
    if (!userIsAdmin) {
      return {
        allowed: false,
        reason: 'Inventory is locked. Only administrators can make changes.',
      }
    }
  }

  // Allow read actions even when locked
  return { allowed: true }
}
