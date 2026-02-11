import { getInventoryItems } from '@/lib/actions/inventory'
import { getInventoryLockStatus } from '@/lib/actions/settings'
import { InventoryClient } from './inventory-client'
import { AddInventoryDialog } from '@/components/inventory/add-inventory-dialog'
import { InventoryLockToggle } from '@/components/inventory/inventory-lock-toggle'

export default async function InventoryPage() {
  const [inventoryResult, lockStatusResult] = await Promise.all([
    getInventoryItems(),
    getInventoryLockStatus(),
  ])

  if (!inventoryResult.success) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Inventory</h1>
          <p className="text-muted-foreground mt-2 text-destructive">
            {inventoryResult.error || 'Failed to load inventory'}
          </p>
        </div>
      </div>
    )
  }

  const inventoryItems = inventoryResult.data || []
  const lockStatus = lockStatusResult.success
    ? lockStatusResult.data
    : { isLocked: false, isAdmin: false }
  const canEdit = !lockStatus.isLocked || lockStatus.isAdmin

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Inventory</h1>
          <p className="text-muted-foreground">Manage clinic inventory items and stock.</p>
        </div>
        <div className="flex items-center gap-3">
          <InventoryLockToggle isLocked={lockStatus.isLocked} isAdmin={lockStatus.isAdmin} />
          <AddInventoryDialog buttonText="Add Item" disabled={!canEdit} />
        </div>
      </div>

      <InventoryClient products={inventoryItems} canEdit={canEdit} />
    </div>
  )
}
