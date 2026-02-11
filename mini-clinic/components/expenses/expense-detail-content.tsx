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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Pencil, Trash2, ArrowLeft } from 'lucide-react'
import { format } from 'date-fns'
import { type Expense } from '@/app/(protected)/expenses/columns'
import { EditExpenseDialog } from './edit-expense-dialog'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { deleteExpense } from '@/lib/actions/expenses'
import { toast } from 'sonner'
import { DeleteConfirmationDialog } from '@/components/ui/delete-confirmation-dialog'

interface ExpenseDetailContentProps {
  expense: Expense
}

export function ExpenseDetailContent({ expense }: ExpenseDetailContentProps) {
  const router = useRouter()
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  const handleDelete = async () => {
    const result = await deleteExpense(expense.id)
    if (result.success) {
      toast.success('Expense deleted successfully')
      router.push('/expenses')
    } else {
      toast.error(result.error || 'Failed to delete expense')
    }
  }

  const formattedAmount = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'GHS',
  }).format(expense.amount / 100)

  const expenseDate = expense.date ? new Date(expense.date) : new Date(expense.createdAt)

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Breadcrumbs */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/expenses">Expenses</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>
              {expense.category} - {formattedAmount}
            </BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
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

      {/* Expense Details */}
      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Expense Details</CardTitle>
            <CardDescription>Complete information about this expense</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Category</p>
                <div className="mt-1">
                  <Badge variant="outline" className="capitalize">
                    {expense.category}
                  </Badge>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Amount</p>
                <p className="mt-1 text-lg font-semibold">{formattedAmount}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Date</p>
                <p className="mt-1">{format(expenseDate, 'MMMM d, yyyy')}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Created At</p>
                <p className="mt-1">
                  {format(new Date(expense.createdAt), "MMMM d, yyyy 'at' h:mm a")}
                </p>
              </div>
            </div>
            {expense.paidTo && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Paid To</p>
                <p className="mt-1">{expense.paidTo}</p>
              </div>
            )}
            {expense.paymentMethod && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Payment Method</p>
                <p className="mt-1 capitalize">{expense.paymentMethod.replace('_', ' ')}</p>
              </div>
            )}
            {expense.description && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Description / Notes</p>
                <p className="mt-1 whitespace-pre-wrap">{expense.description}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {showEditDialog && (
        <EditExpenseDialog
          expense={expense}
          open={showEditDialog}
          onOpenChange={(open) => {
            setShowEditDialog(open)
            if (!open) {
              router.refresh()
            }
          }}
        />
      )}

      {showDeleteDialog && (
        <DeleteConfirmationDialog
          open={showDeleteDialog}
          onOpenChange={setShowDeleteDialog}
          onConfirm={handleDelete}
          title="Delete Expense"
          description="Are you sure you want to delete this expense? This action cannot be undone."
          itemName={`${expense.category} - ${formattedAmount}`}
        />
      )}
    </div>
  )
}
