'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DailyReportForm } from '@/components/reports/daily-report-form'
import { createDailyReport } from '@/lib/actions/reports'
import { toast } from 'sonner'

interface AddReportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  submittedBy: string
  onSuccess?: () => void
}

export function AddReportDialog({
  open,
  onOpenChange,
  submittedBy,
  onSuccess,
}: AddReportDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (payload: {
    reportDate: Date
    checkedInCount: number
    newPatientsCount: number
    totalPayments: number
    totalExpenses: number
    balances: Array<{ method: string; amount: number }>
    inventoryUsed: Array<{ id: string; quantity: number }>
    productsSold: Array<{ id: string; quantity: number }>
    additionalNote?: string
  }) => {
    setIsSubmitting(true)
    const result = await createDailyReport(payload)
    if (result.success) {
      toast.success('Report submitted successfully.')
      onOpenChange(false)
      onSuccess?.()
    } else {
      toast.error(result.error || 'Failed to submit report.')
    }
    setIsSubmitting(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Submit Daily Report</DialogTitle>
        </DialogHeader>
        <DailyReportForm
          submittedBy={submittedBy}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
        />
      </DialogContent>
    </Dialog>
  )
}
