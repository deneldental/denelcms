'use client'

import { ColumnDef } from '@tanstack/react-table'
import { DataTableColumnHeader } from '@/components/data-table/data-table-column-header'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import { MoreHorizontal, Eye, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { expenses } from '@/lib/db/schema'
import { deleteExpense } from '@/lib/actions/expenses'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { DeleteConfirmationDialog } from '@/components/ui/delete-confirmation-dialog'
import { EditExpenseDialog } from '@/components/expenses/edit-expense-dialog'

export type Expense = typeof expenses.$inferSelect

function ExpenseActions({ expense }: { expense: Expense }) {
  const router = useRouter()
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  const handleDelete = async () => {
    const result = await deleteExpense(expense.id)

    if (result.success) {
      toast.success('Expense deleted successfully')
      router.refresh()
    } else {
      toast.error(result.error || 'Failed to delete expense')
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
          <DropdownMenuItem onClick={() => router.push(`/expenses/view/${expense.id}`)}>
            <Eye className="mr-2 h-4 w-4" />
            View Details
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setShowEditDialog(true)}>
            <Pencil className="mr-2 h-4 w-4" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setShowDeleteDialog(true)} className="text-destructive">
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {showEditDialog && (
        <EditExpenseDialog
          expense={expense}
          open={showEditDialog}
          onOpenChange={setShowEditDialog}
        />
      )}

      {showDeleteDialog && (
        <DeleteConfirmationDialog
          open={showDeleteDialog}
          onOpenChange={setShowDeleteDialog}
          onConfirm={handleDelete}
          title="Delete Expense"
          description="Are you sure you want to delete this expense? This action cannot be undone."
          itemName={`${expense.category} - ${new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'GHS',
          }).format(expense.amount / 100)}`}
        />
      )}
    </>
  )
}

export const columns: ColumnDef<Expense>[] = [
  {
    accessorKey: 'date',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Date" />,
    cell: ({ row }) => {
      const date = row.getValue('date') as Date
      return <div>{format(new Date(date), 'MMM d, yyyy')}</div>
    },
  },
  {
    accessorKey: 'category',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Category" />,
    cell: ({ row }) => {
      const category = row.getValue('category') as string
      return (
        <Badge variant="outline" className="capitalize">
          {category}
        </Badge>
      )
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id))
    },
  },
  {
    accessorKey: 'amount',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Amount" />,
    cell: ({ row }) => {
      const amount = row.getValue('amount') as number
      const formatted = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'GHS',
      }).format(amount / 100)
      return <div className="font-medium">{formatted}</div>
    },
  },
  {
    accessorKey: 'description',
    id: 'description',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Description" />,
    cell: ({ row }) => {
      const description = row.getValue('description') as string
      return <div className="max-w-[300px] truncate">{description || '-'}</div>
    },
  },
  {
    accessorKey: 'paidTo',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Paid To" />,
    cell: ({ row }) => {
      const paidTo = row.getValue('paidTo') as string
      return <div>{paidTo || '-'}</div>
    },
  },
  {
    accessorKey: 'paymentMethod',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Payment Method" />,
    cell: ({ row }) => {
      const method = row.getValue('paymentMethod') as string
      return <div className="capitalize">{method ? method.replace('_', ' ') : '-'}</div>
    },
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      return <ExpenseActions expense={row.original} />
    },
  },
]
