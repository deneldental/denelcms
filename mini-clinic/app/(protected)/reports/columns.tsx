'use client'

import { ColumnDef } from '@tanstack/react-table'
import { DataTableColumnHeader } from '@/components/data-table/data-table-column-header'
import { dailyReports } from '@/lib/db/schema'
import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MoreHorizontal, Eye, Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { DeleteConfirmationDialog } from '@/components/ui/delete-confirmation-dialog'
import { deleteDailyReport } from '@/lib/actions/reports'
import { toast } from 'sonner'

export type DailyReport = typeof dailyReports.$inferSelect & {
  submittedBy?: { name?: string | null; email?: string | null }
}

function formatCurrency(amountCents: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'GHS',
  }).format(amountCents / 100)
}

function ReportActions({ report }: { report: DailyReport }) {
  const router = useRouter()
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  const handleDelete = async () => {
    const result = await deleteDailyReport(report.id)
    if (result.success) {
      toast.success('Report deleted successfully')
      router.refresh()
    } else {
      toast.error(result.error || 'Failed to delete report')
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
              router.push(`/reports/${report.id}`)
            }}
          >
            <Eye className="mr-2 h-4 w-4" />
            View Report
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
        title="Delete Report"
        description="Are you sure you want to delete this report? This action cannot be undone."
        itemName={`Report for ${format(new Date(report.reportDate), 'MMM d, yyyy')}`}
      />
    </>
  )
}

export const dailyReportColumns: ColumnDef<DailyReport>[] = [
  {
    accessorKey: 'reportDate',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Date" />,
    cell: ({ row }) => {
      const dateValue = row.getValue('reportDate') as Date
      return <div>{format(new Date(dateValue), 'MMM d, yyyy')}</div>
    },
  },
  {
    accessorKey: 'totalPayments',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Payments" />,
    cell: ({ row }) => formatCurrency(row.getValue('totalPayments') as number),
  },
  {
    accessorKey: 'totalExpenses',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Expenses" />,
    cell: ({ row }) => formatCurrency(row.getValue('totalExpenses') as number),
  },
  {
    id: 'submittedBy',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Submitted By" />,
    cell: ({ row }) => {
      const submittedBy = row.original.submittedBy
      return <div>{submittedBy?.name || submittedBy?.email || 'Unknown'}</div>
    },
  },
  {
    accessorKey: 'createdAt',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Created" />,
    cell: ({ row }) => {
      const dateValue = row.getValue('createdAt') as Date
      return <div>{format(new Date(dateValue), "MMM d, yyyy 'at' h:mm a")}</div>
    },
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      return <ReportActions report={row.original} />
    },
  },
]
