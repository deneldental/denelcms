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
import { MoreHorizontal, Eye, Pencil, Trash2, Check, ChevronsUpDown } from 'lucide-react'
import { inventory } from '@/lib/db/schema'
import { deleteInventoryItem } from '@/lib/actions/inventory'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { EditInventoryDialog } from '@/components/inventory/edit-inventory-dialog'
import { useState, useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { Column } from '@tanstack/react-table'
import { getCategories } from '@/lib/actions/categories'

export type Product = typeof inventory.$inferSelect

function CategoryFilter({ column }: { column: Column<Product> }) {
  const selectedValues = new Set((column.getFilterValue() as string[]) || [])
  const [categories, setCategories] = useState<string[]>([])

  useEffect(() => {
    getCategories().then((res) => {
      if (res.success && res.data) {
        interface Category {
          name: string
        }
        setCategories(res.data.map((c: Category) => c.name))
      }
    })
  }, [])

  if (categories.length === 0) {
    return null
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="h-8 border-dashed">
          Category
          {selectedValues.size > 0 && (
            <Badge variant="secondary" className="ml-2 rounded-sm px-1 font-normal">
              {selectedValues.size}
            </Badge>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0" align="start">
        <div className="p-2">
          {categories.map((category) => {
            const isSelected = selectedValues.has(category)
            return (
              <div
                key={category}
                className="flex items-center space-x-2 cursor-pointer hover:bg-accent rounded-sm p-1.5"
                onClick={() => {
                  const newValues = new Set(selectedValues)
                  if (isSelected) {
                    newValues.delete(category)
                  } else {
                    newValues.add(category)
                  }
                  column.setFilterValue(newValues.size > 0 ? Array.from(newValues) : undefined)
                }}
              >
                <div
                  className={cn(
                    'flex h-4 w-4 items-center justify-center rounded-sm border border-primary',
                    isSelected
                      ? 'bg-primary text-primary-foreground'
                      : 'opacity-50 [&_svg]:invisible'
                  )}
                >
                  <Check className="h-3 w-3" />
                </div>
                <span className="text-sm capitalize">{category}</span>
              </div>
            )
          })}
        </div>
      </PopoverContent>
    </Popover>
  )
}

function ProductActions({
  product,
  onView,
  canEdit = true,
}: {
  product: Product
  onView: () => void
  canEdit?: boolean
}) {
  const router = useRouter()
  const [showEditDialog, setShowEditDialog] = useState(false)

  const handleDelete = async () => {
    if (confirm(`Are you sure you want to delete ${product.name}?`)) {
      const result = await deleteInventoryItem(product.id)
      if (result.success) {
        toast.success('Inventory item deleted successfully')
        router.refresh()
      } else {
        toast.error(result.error || 'Failed to delete inventory item')
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
              onView()
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
            disabled={!canEdit}
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
            disabled={!canEdit}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <EditInventoryDialog
        product={product}
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
      />
    </>
  )
}

export const columns: ColumnDef<Product>[] = [
  {
    accessorKey: 'name',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Item Name" />,
    cell: ({ row }) => {
      return <div className="font-medium">{row.getValue('name')}</div>
    },
  },
  {
    accessorKey: 'unit',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Unit" />,
    cell: ({ row }) => {
      const unit = row.getValue('unit') as string
      return <div className="uppercase text-sm">{unit || '-'}</div>
    },
  },
  {
    accessorKey: 'category',
    header: ({ column }) => (
      <div className="flex items-center gap-2">
        <DataTableColumnHeader column={column} title="Category" />
        <CategoryFilter column={column} />
      </div>
    ),
    cell: ({ row }) => {
      const category = row.getValue('category') as string
      return (
        <Badge variant="outline" className="capitalize">
          {category || '-'}
        </Badge>
      )
    },
    filterFn: (row, id, value) => {
      if (!value || value.length === 0) return true
      const category = row.getValue(id) as string
      return value.includes(category)
    },
  },
  {
    accessorKey: 'stockQuantity',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Quantity" />,
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
    accessorKey: 'sku',
    header: ({ column }) => <DataTableColumnHeader column={column} title="SKU" />,
    cell: ({ row }) => {
      return <div className="font-mono text-xs">{row.getValue('sku') || '-'}</div>
    },
    enableHiding: true,
  },
  {
    id: 'actions',
    cell: ({ row, table }) => {
      interface TableMeta {
        canEdit?: boolean
      }
      interface RowData {
        onRowClick?: () => void
      }
      const meta = table.options.meta as TableMeta | undefined
      const canEdit = meta?.canEdit ?? true
      const onView = () => {
        const rowData = row.original as RowData
        if (rowData?.onRowClick) {
          rowData.onRowClick()
        }
      }
      return <ProductActions product={row.original} onView={onView} canEdit={canEdit} />
    },
  },
]
