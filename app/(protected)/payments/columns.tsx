'use client'

import Link from 'next/link'

import { ColumnDef } from '@tanstack/react-table'
import { DataTableColumnHeader } from '@/components/data-table/data-table-column-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MoreHorizontal, Printer, Eye, Trash2 } from 'lucide-react'
import { payments } from '@/lib/db/schema'
import { deletePayment } from '@/lib/actions/payments'
import { getPaymentsByPatientId } from '@/lib/actions/payments'
import { getPaymentPlanByPatientId } from '@/lib/actions/payment-plans'
import { generatePaymentReceipt } from '@/lib/utils/receipt'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { DeleteConfirmationDialog } from '@/components/ui/delete-confirmation-dialog'
import { ReceiptViewDialog } from '@/components/payments/receipt-view-dialog'
import { format } from 'date-fns'
import { paymentPlans } from '@/lib/db/schema'

export type PaymentPlan = typeof paymentPlans.$inferSelect & {
  patient?: {
    id: string
    name: string
    phone: string | null
    patientId: string | null
  } | null
}
export type Payment = typeof payments.$inferSelect & {
  patient?: {
    id: string
    name: string
    phone: string | null
  } | null
  paymentPlan?: {
    id: string
    notes: string | null
    totalAmount: number
  } | null
}

export const activePaymentPlanColumns: ColumnDef<PaymentPlan>[] = [
  {
    accessorKey: 'createdAt',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Date" />,
    cell: ({ row }) => {
      const date = row.getValue('createdAt') as Date
      return <div>{new Date(date).toLocaleDateString()}</div>
    },
  },
  {
    accessorKey: 'patient.name',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Patient" />,
    cell: ({ row }) => {
      const patientId = row.original.patient?.id
      const name = row.original.patient?.name || 'Unknown'

      if (patientId) {
        return (
          <Link href={`/patients/${patientId}`} className="hover:underline text-primary font-medium">
            {name}
          </Link>
        )
      }
      return <div>{name}</div>
    },
  },
  {
    accessorKey: 'patient.patientId',
    id: 'patientId',
    header: ({ column }) => <DataTableColumnHeader column={column} title="ID" />,
    cell: ({ row }) => {
      return <div>{row.original.patient?.patientId || '-'}</div>
    },
  },
  {
    accessorKey: 'totalAmount',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Total Amount" />,
    cell: ({ row }) => {
      const amount = row.getValue('totalAmount') as number
      const formatted = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'GHS',
      }).format(amount / 100)
      return <div className="font-medium">{formatted}</div>
    },
  },
  {
    accessorKey: 'amountPerInstallment',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Installment" />,
    cell: ({ row }) => {
      const amount = row.getValue('amountPerInstallment') as number
      const formatted = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'GHS',
      }).format(amount / 100)
      return <div>{formatted}</div>
    },
  },
  {
    accessorKey: 'paymentFrequency',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Frequency" />,
    cell: ({ row }) => {
      const frequency = row.getValue('paymentFrequency') as string
      return <div className="capitalize">{frequency}</div>
    },
  },
  {
    accessorKey: 'status',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
    cell: ({ row }) => {
      const status = row.getValue('status') as string
      return (
        <Badge
          variant={
            status === 'completed'
              ? 'default'
              : status === 'overdue'
                ? 'destructive'
                : 'secondary'
          }
        >
          {status}
        </Badge>
      )
    },
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      const router = useRouter()
      return (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push(`/payment-plans/${row.original.id}`)}
        >
          <Eye className="mr-2 h-4 w-4" />
          View Details
        </Button>
      )
    },
  },
]

// Helper function to parse description into treatment types and additional notes
function parseDescription(description: string | null): {
  treatmentTypes: string
  additionalNotes: string | null
} {
  if (!description) {
    return { treatmentTypes: '-', additionalNotes: null }
  }

  // Split by " - " to separate treatment types from additional notes
  const parts = description.split(' - ')
  const treatmentTypes = parts[0] || '-'
  const additionalNotes = parts.length > 1 ? parts.slice(1).join(' - ') : null

  return { treatmentTypes, additionalNotes }
}

function PaymentActions({ payment }: { payment: Payment }) {
  const router = useRouter()
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showReceiptDialog, setShowReceiptDialog] = useState(false)
  interface ReceiptData {
    patientName: string
    appointmentDate?: string
    amountPaid: number
    totalAmount?: number
    balance?: number
    paymentType: string
    paymentFor: string
    notes: string | null
    clinicName: string
    clinicPhone: string | null
    clinicAddress: string | null
    generatedAt: string
  }
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handlePrintReceipt = async () => {
    try {
      if (!payment.patient) {
        toast.error('Patient information not available')
        return
      }

      let paymentPlanTotal: number | undefined
      let paymentPlanBalance: number | undefined

      // If it's a plan payment, use stored balance or calculate it
      if (payment.paymentPlanId && payment.patientId) {
        // Use stored balance if available (for older receipts)
        if (payment.balance !== null && payment.balance !== undefined) {
          paymentPlanBalance = payment.balance

          // Still need total amount for display
          const planResult = await getPaymentPlanByPatientId(payment.patientId)
          if (planResult.success && planResult.data) {
            paymentPlanTotal = planResult.data.totalAmount
          }
        } else {
          // Calculate balance for newer payments without stored balance
          const [planResult, paymentsResult] = await Promise.all([
            getPaymentPlanByPatientId(payment.patientId),
            getPaymentsByPatientId(payment.patientId),
          ])

          if (planResult.success && planResult.data) {
            paymentPlanTotal = planResult.data.totalAmount

            // Calculate balance: total - all completed payments for this plan (including current payment)
            const completedPayments = paymentsResult.success
              ? paymentsResult.data.filter(
                (p) => p.status === 'completed' && p.paymentPlanId === planResult.data?.id
              )
              : []
            const totalPaid = completedPayments.reduce((sum, p) => sum + p.amount, 0)
            // Balance after all payments including this one
            paymentPlanBalance = planResult.data.totalAmount - totalPaid
          }
        }
      }

      generatePaymentReceipt({
        patientName: payment.patient.name,
        amountPaid: payment.amount,
        paymentMethod: payment.method,
        description:
          payment.paymentPlanId && payment.paymentPlan
            ? payment.description || payment.paymentPlan.notes || undefined // Use payment description or fallback to plan notes
            : payment.description || undefined, // For one-time payments, use description
        appointmentDate: payment.createdAt,
        paymentPlanTotal,
        paymentPlanBalance,
        paymentType: payment.paymentPlanId ? 'plan' : 'one-time',
        autoPrint: true,
      })
    } catch (error) {
      console.error('Failed to generate receipt:', error)
      toast.error('Failed to generate receipt')
    }
  }

  const prepareReceiptData = async () => {
    if (!payment.patient) {
      toast.error('Patient information not available')
      return null
    }

    let paymentPlanTotal: number | undefined
    let paymentPlanBalance: number | undefined

    // If it's a plan payment, use stored balance or calculate it
    if (payment.paymentPlanId && payment.patientId) {
      // Use stored balance if available (for older receipts)
      if (payment.balance !== null && payment.balance !== undefined) {
        paymentPlanBalance = payment.balance

        // Still need total amount for display
        const planResult = await getPaymentPlanByPatientId(payment.patientId)
        if (planResult.success && planResult.data) {
          paymentPlanTotal = planResult.data.totalAmount
        }
      } else {
        // Calculate balance for newer payments without stored balance
        const [planResult, paymentsResult] = await Promise.all([
          getPaymentPlanByPatientId(payment.patientId),
          getPaymentsByPatientId(payment.patientId),
        ])

        if (planResult.success && planResult.data) {
          paymentPlanTotal = planResult.data.totalAmount

          // Calculate balance: total - all completed payments for this plan (including current payment)
          const completedPayments = paymentsResult.success
            ? paymentsResult.data.filter(
              (p) => p.status === 'completed' && p.paymentPlanId === planResult.data?.id
            )
            : []
          const totalPaid = completedPayments.reduce((sum, p) => sum + p.amount, 0)
          // Balance after all payments including this one
          paymentPlanBalance = planResult.data.totalAmount - totalPaid
        }
      }
    }

    // Format appointment date
    let formattedAppointmentDate: string | undefined
    if (payment.createdAt) {
      try {
        const date =
          typeof payment.createdAt === 'string' ? new Date(payment.createdAt) : payment.createdAt
        formattedAppointmentDate = format(date, 'MMMM d, yyyy h:mm a')
      } catch {
        formattedAppointmentDate = undefined
      }
    }

    // Convert cents to GHS
    const amountPaidGHS = payment.amount / 100
    const totalAmountGHS = paymentPlanTotal ? paymentPlanTotal / 100 : undefined
    const balanceGHS = paymentPlanBalance !== undefined ? paymentPlanBalance / 100 : undefined

    return {
      patientName: payment.patient.name,
      appointmentDate: formattedAppointmentDate,
      amountPaid: amountPaidGHS,
      totalAmount: totalAmountGHS,
      balance: balanceGHS,
      paymentType: payment.method,
      paymentFor: payment.paymentPlanId
        ? 'Ortho Payment'
        : payment.description || 'Service Payment',
      notes: payment.description || null,
      clinicName: process.env.NEXT_PUBLIC_CLINIC_NAME || 'Framada Dental Clinic',
      clinicPhone: process.env.NEXT_PUBLIC_CLINIC_PHONE || null,
      clinicAddress: process.env.NEXT_PUBLIC_CLINIC_ADDRESS || null,
      generatedAt: new Date().toLocaleString(),
    }
  }

  const handleViewReceipt = async () => {
    try {
      const data = await prepareReceiptData()
      if (data) {
        setReceiptData(data)
        setShowReceiptDialog(true)
      }
    } catch (error) {
      console.error('Failed to prepare receipt:', error)
      toast.error('Failed to load receipt')
    }
  }

  const handleDelete = async () => {
    setIsLoading(true)
    try {
      const result = await deletePayment(payment.id)
      if (result.success) {
        toast.success('Payment deleted successfully')
        router.refresh()
      } else {
        toast.error(result.error || 'Failed to delete payment')
      }
    } catch {
      toast.error('An error occurred while deleting the payment')
    } finally {
      setIsLoading(false)
      setShowDeleteDialog(false)
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
              handlePrintReceipt()
            }}
          >
            <Printer className="mr-2 h-4 w-4" />
            Print Receipt
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation()
              handleViewReceipt()
            }}
          >
            <Eye className="mr-2 h-4 w-4" />
            View Receipt
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation()
              setShowDeleteDialog(true)
            }}
            className="text-destructive"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <DeleteConfirmationDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        onConfirm={handleDelete}
        title="Delete Payment"
        description="Are you sure you want to delete this payment? This action cannot be undone."
        itemName={`Payment of ${new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'GHS',
        }).format(payment.amount / 100)}`}
        isLoading={isLoading}
      />
      {receiptData && (
        <ReceiptViewDialog
          open={showReceiptDialog}
          onOpenChange={setShowReceiptDialog}
          receiptData={receiptData}
        />
      )}
    </>
  )
}

export const oneTimePaymentColumns: ColumnDef<Payment>[] = [
  {
    accessorKey: 'createdAt',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Date" />,
    cell: ({ row }) => {
      const date = row.getValue('createdAt') as Date
      return <div>{new Date(date).toLocaleDateString()}</div>
    },
  },
  {
    accessorKey: 'patient.name',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Patient" />,
    cell: ({ row }) => {
      return <div>{row.original.patient?.name || 'Walk-in'}</div>
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
    accessorKey: 'method',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Method" />,
    cell: ({ row }) => {
      const method = row.getValue('method') as string
      return <div className="capitalize">{method.replace('_', ' ')}</div>
    },
  },
  {
    accessorKey: 'status',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
    cell: ({ row }) => {
      const status = row.getValue('status') as string
      return (
        <Badge
          variant={
            status === 'completed'
              ? 'default'
              : status === 'pending'
                ? 'secondary'
                : status === 'failed'
                  ? 'destructive'
                  : 'outline'
          }
        >
          {status}
        </Badge>
      )
    },
  },
  {
    accessorKey: 'description',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Treatment Types" />,
    cell: ({ row }) => {
      const description = row.getValue('description') as string | null
      const { treatmentTypes } = parseDescription(description)
      return <div>{treatmentTypes}</div>
    },
  },
  {
    id: 'additionalNotes',
    accessorFn: (row) => {
      const { additionalNotes } = parseDescription(row.description)
      return additionalNotes
    },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Additional Notes" />,
    cell: ({ row }) => {
      const description = row.original.description
      const { additionalNotes } = parseDescription(description)
      return <div className="text-muted-foreground">{additionalNotes || '-'}</div>
    },
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      return <PaymentActions payment={row.original} />
    },
  },
]

export const planPaymentColumns: ColumnDef<Payment>[] = [
  {
    accessorKey: 'createdAt',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Date" />,
    cell: ({ row }) => {
      const date = row.getValue('createdAt') as Date
      return <div>{new Date(date).toLocaleDateString()}</div>
    },
  },
  {
    accessorKey: 'patient.name',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Patient" />,
    cell: ({ row }) => {
      return <div>{row.original.patient?.name || 'Unknown'}</div>
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
    accessorKey: 'method',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Method" />,
    cell: ({ row }) => {
      const method = row.getValue('method') as string
      return <div className="capitalize">{method.replace('_', ' ')}</div>
    },
  },
  {
    accessorKey: 'status',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
    cell: ({ row }) => {
      const status = row.getValue('status') as string
      return (
        <Badge
          variant={
            status === 'completed'
              ? 'default'
              : status === 'pending'
                ? 'secondary'
                : status === 'failed'
                  ? 'destructive'
                  : 'outline'
          }
        >
          {status}
        </Badge>
      )
    },
  },
  {
    accessorKey: 'description',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Treatment Types" />,
    cell: ({ row }) => {
      const description = row.getValue('description') as string | null
      const { treatmentTypes } = parseDescription(description)
      return <div>{treatmentTypes}</div>
    },
  },
  {
    id: 'additionalNotes',
    accessorFn: (row) => {
      const { additionalNotes } = parseDescription(row.description)
      return additionalNotes
    },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Additional Notes" />,
    cell: ({ row }) => {
      const description = row.original.description
      const { additionalNotes } = parseDescription(description)
      return <div className="text-muted-foreground">{additionalNotes || '-'}</div>
    },
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      return <PaymentActions payment={row.original} />
    },
  },
]
