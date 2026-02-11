'use client'

import { ColumnDef } from '@tanstack/react-table'
import { DataTableColumnHeader } from '@/components/data-table/data-table-column-header'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MoreHorizontal, Eye, Pencil, Trash2 } from 'lucide-react'
import { products } from '@/lib/db/schema'
import { deleteProduct } from '@/lib/actions/products'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

import { EditProductDialog } from '@/components/products/edit-product-dialog'
import { useState } from 'react'

export type Product = typeof products.$inferSelect

function ProductActions({ product }: { product: Product }) {
  const router = useRouter()
  const [showEditDialog, setShowEditDialog] = useState(false)

  const handleDelete = async () => {
    if (confirm(`Are you sure you want to delete ${product.name}?`)) {
      const result = await deleteProduct(product.id)
      if (result.success) {
        toast.success('Product deleted successfully')
        router.refresh()
      } else {
        toast.error(result.error || 'Failed to delete product')
      }
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <span className="sr-only">Open menu</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation()
              // router.push(`/products/${product.id}`)
              toast.info('Product details view coming soon')
            }}
          >
            <Eye className="mr-2 h-4 w-4" />
            View
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation()
              setShowEditDialog(true)
            }}
          >
            <Pencil className="mr-2 h-4 w-4" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation()
              handleDelete()
            }}
            className="text-destructive"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <EditProductDialog product={product} open={showEditDialog} onOpenChange={setShowEditDialog} />
    </>
  )
}

export const columns: ColumnDef<Product>[] = [
  {
    accessorKey: 'name',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Product Name" />,
    cell: ({ row }) => {
      return <div className="font-medium">{row.getValue('name')}</div>
    },
  },
  {
    accessorKey: 'sku',
    header: ({ column }) => <DataTableColumnHeader column={column} title="SKU" />,
    cell: ({ row }) => {
      return <div className="font-mono text-xs">{row.getValue('sku') || '-'}</div>
    },
  },
  {
    accessorKey: 'category',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Category" />,
    cell: ({ row }) => {
      return <div className="capitalize">{row.getValue('category') || '-'}</div>
    },
  },
  {
    accessorKey: 'costPrice',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Cost Price" />,
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue('costPrice') as string)
      const formatted = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'GHS',
      }).format(amount / 100)
      return <div className="text-muted-foreground">{formatted}</div>
    },
  },
  {
    accessorKey: 'price',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Selling Price" />,
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue('price') as string)
      const formatted = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'GHS',
      }).format(amount / 100)
      return <div className="font-medium">{formatted}</div>
    },
  },
  {
    id: 'profit',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Profit/Loss" />,
    cell: ({ row }) => {
      const costPrice = Number(row.original.costPrice || 0)
      const sellingPrice = Number(row.original.price || 0)
      const profit = sellingPrice - costPrice
      const profitMargin = costPrice > 0 ? ((profit / costPrice) * 100).toFixed(1) : '0.0'
      const formatted = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'GHS',
      }).format(profit / 100)

      return (
        <div className={`font-medium ${profit >= 0 ? 'text-green-600' : 'text-destructive'}`}>
          {formatted} ({profitMargin}%)
        </div>
      )
    },
  },
  {
    accessorKey: 'stockQuantity',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Stock" />,
    cell: ({ row }) => {
      const quantity = row.getValue('stockQuantity') as number
      const reorderLevel = row.original.reorderLevel || 10
      return (
        <div className={`font-medium ${quantity <= reorderLevel ? 'text-destructive' : ''}`}>
          {quantity}
        </div>
      )
    },
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      return <ProductActions product={row.original} />
    },
  },
]
