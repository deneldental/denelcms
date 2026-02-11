'use client'

import Link from 'next/link'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Pencil, Trash2, ArrowLeft } from 'lucide-react'
import { format } from 'date-fns'
import { type Product } from '@/app/(protected)/inventory/columns'
import { EditInventoryDialog } from './edit-inventory-dialog'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { deleteInventoryItem } from '@/lib/actions/inventory'
import { toast } from 'sonner'
import { DeleteConfirmationDialog } from '@/components/ui/delete-confirmation-dialog'

interface InventoryDetailContentProps {
  product: Product
}

export function InventoryDetailContent({ product }: InventoryDetailContentProps) {
  const router = useRouter()
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  const handleDelete = async () => {
    const result = await deleteInventoryItem(product.id)
    if (result.success) {
      toast.success('Inventory item deleted successfully')
      router.push('/inventory')
    } else {
      toast.error(result.error || 'Failed to delete inventory item')
    }
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Breadcrumbs */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/inventory">Inventory</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{product.name}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => router.push('/inventory')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Inventory
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowEditDialog(true)}>
            <Pencil className="mr-2 h-4 w-4" />
            Edit
          </Button>
          <Button variant="destructive" size="sm" onClick={() => setShowDeleteDialog(true)}>
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>

      {/* Inventory Details */}
      <div className="grid gap-6">
        {product.image && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium">Image</h3>
            <div className="aspect-square max-w-xs rounded-lg overflow-hidden border border-muted">
              <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Item Name</p>
            <p className="text-lg font-medium">{product.name}</p>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Unit</p>
            <p className="text-lg uppercase">{product.unit || '-'}</p>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Category</p>
            <Badge variant="outline" className="capitalize w-fit">
              {product.category || '-'}
            </Badge>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Quantity</p>
            <p
              className={`text-lg font-medium ${product.stockQuantity <= (product.reorderLevel || 10) ? 'text-destructive' : ''}`}
            >
              {product.stockQuantity}
            </p>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Reorder Level</p>
            <p className="text-lg">{product.reorderLevel || 10}</p>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">SKU</p>
            <p className="text-lg font-mono text-sm">{product.sku || '-'}</p>
          </div>
        </div>

        {product.description && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Description</p>
            <p className="text-sm">{product.description}</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Created</p>
            <p className="text-sm">{format(new Date(product.createdAt), 'PPp')}</p>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Last Updated</p>
            <p className="text-sm">{format(new Date(product.updatedAt), 'PPp')}</p>
          </div>
        </div>
      </div>

      <EditInventoryDialog
        product={product}
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
      />
      <DeleteConfirmationDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        onConfirm={handleDelete}
        title="Delete Inventory Item"
        description={`Are you sure you want to delete "${product.name}"? This action cannot be undone.`}
      />
    </div>
  )
}
