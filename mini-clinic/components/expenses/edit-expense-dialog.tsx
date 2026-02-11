'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Loader2 } from 'lucide-react'
import { updateExpense } from '@/lib/actions/expenses'
import { toast } from 'sonner'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { type Expense } from '@/app/(protected)/expenses/columns'
import { useRouter } from 'next/navigation'
import { getExpenseCategories } from '@/lib/actions/expense-categories'
import { getPaymentMethods } from '@/lib/actions/payment-methods'

interface EditExpenseDialogProps {
  expense: Expense
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EditExpenseDialog({ expense, open, onOpenChange }: EditExpenseDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const [category, setCategory] = useState<string>(expense.category || '')
  const [paymentMethod, setPaymentMethod] = useState<string>(expense.paymentMethod || '')
  const [categories, setCategories] = useState<
    Array<{ id: string; name: string; displayName: string | null }>
  >([])
  const [paymentMethods, setPaymentMethods] = useState<
    Array<{ id: string; name: string; displayName: string | null }>
  >([])

  // Update state when expense changes - done during render to avoid cascading updates
  const [prevExpenseId, setPrevExpenseId] = useState(expense.id)
  if (expense.id !== prevExpenseId) {
    setPrevExpenseId(expense.id)
    setCategory(expense.category || '')
    setPaymentMethod(expense.paymentMethod || '')
  }

  // Load categories and payment methods when dialog opens
  useEffect(() => {
    if (open) {
      getExpenseCategories().then((result) => {
        if (result.success && result.data) {
          setCategories(result.data)
        }
      })
      getPaymentMethods().then((result) => {
        if (result.success && result.data) {
          setPaymentMethods(result.data)
        }
      })
    }
  }, [open])

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsLoading(true)

    const formData = new FormData(event.currentTarget)

    const amount = parseFloat(formData.get('amount') as string) * 100 // Convert to cents
    const date = formData.get('date') as string
    const description = formData.get('description') as string
    const paidTo = formData.get('paidTo') as string

    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid amount')
      setIsLoading(false)
      return
    }

    if (!category) {
      toast.error('Please select a category')
      setIsLoading(false)
      return
    }

    const data = {
      category,
      amount: Math.round(amount),
      date: new Date(date),
      description: description || null,
      paidTo: paidTo || null,
      paymentMethod: paymentMethod || null,
    }

    const result = await updateExpense(expense.id, data)

    setIsLoading(false)

    if (result.success) {
      onOpenChange(false)
      toast.success('Expense updated successfully.')
      router.refresh()
    } else {
      toast.error(result.error || 'Something went wrong.')
    }
  }

  const expenseDate = expense.date
    ? new Date(expense.date).toISOString().split('T')[0]
    : new Date().toISOString().split('T')[0]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={onSubmit}>
          <DialogHeader>
            <DialogTitle>Edit Expense</DialogTitle>
            <DialogDescription>Update expense details.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-category">Category</Label>
              <Select value={category} onValueChange={setCategory} required>
                <SelectTrigger id="edit-category">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.name}>
                      {cat.displayName || cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-amount">Amount (₵)</Label>
              <Input
                id="edit-amount"
                name="amount"
                type="number"
                step="0.01"
                defaultValue={expense.amount / 100}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-date">Date</Label>
              <Input id="edit-date" name="date" type="date" defaultValue={expenseDate} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-paidTo">Paid To</Label>
              <Input
                id="edit-paidTo"
                name="paidTo"
                defaultValue={expense.paidTo || ''}
                placeholder="Who was this expense paid to?"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-paymentMethod">Payment Method</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger id="edit-paymentMethod">
                  <SelectValue placeholder="Select payment method" />
                </SelectTrigger>
                <SelectContent>
                  {paymentMethods.map((method) => (
                    <SelectItem key={method.id} value={method.name}>
                      {method.displayName || method.name.replace('_', ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Note / Description</Label>
              <Textarea
                id="edit-description"
                name="description"
                defaultValue={expense.description || ''}
                placeholder="Additional information about this expense"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
