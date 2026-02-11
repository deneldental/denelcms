'use client'

import { ColumnDef } from '@tanstack/react-table'
import { DataTableColumnHeader } from '@/components/data-table/data-table-column-header'
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
import { deleteMedicalRecord } from '@/lib/actions/medical-records'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { DeleteConfirmationDialog } from '@/components/ui/delete-confirmation-dialog'
import { ROLES } from '@/lib/modules'

export interface MedicalRecord {
  id: string
  onRowClick?: () => void
  [key: string]: unknown
}

interface TableMeta {
  userRole?: string
}

function MedicalRecordActions({ record, meta }: { record: MedicalRecord; meta?: TableMeta }) {
  const router = useRouter()
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const isDoctor = meta?.userRole === ROLES.DOCTOR

  const handleDelete = async () => {
    const result = await deleteMedicalRecord(record.id)
    if (result.success) {
      toast.success('Medical record deleted successfully')
      router.refresh()
      setShowDeleteDialog(false)
    } else {
      toast.error(result.error || 'Failed to delete medical record')
    }
  }

  const handleView = () => {
    if (record?.onRowClick) {
      record.onRowClick()
    } else {
      router.push(`/medical-records/${record.id}`)
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
          <DropdownMenuItem onClick={handleView}>
            <Eye className="mr-2 h-4 w-4" />
            View Details
          </DropdownMenuItem>
          {!isDoctor && (
            <>
              <DropdownMenuItem>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => setShowDeleteDialog(true)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      <DeleteConfirmationDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        onConfirm={handleDelete}
        title="Delete Medical Record"
        description="Are you sure you want to delete this medical record? This action cannot be undone."
      />
    </>
  )
}

export interface MedicalRecordData {
  id: string
  date: Date | string
  createdAt: Date | string
  patient?: {
    name: string
  }
  doctor?: {
    user?: {
      name: string
    }
  }
  [key: string]: unknown
}

export const columns: ColumnDef<MedicalRecordData>[] = [
  {
    accessorKey: 'date',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Date" />,
    cell: ({ row }) => {
      const date = new Date(row.original.createdAt)
      return <div>{format(date, 'MMM d, yyyy')}</div>
    },
  },
  {
    accessorKey: 'patient.name',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Patient" />,
    cell: ({ row }) => {
      return <div className="font-medium">{row.original.patient?.name || 'Unknown'}</div>
    },
  },
  {
    accessorKey: 'complaint',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Complaint" />,
    cell: ({ row }) => {
      const complaint = row.getValue('complaint') as string
      return <div className="max-w-[200px] truncate">{complaint || '-'}</div>
    },
  },
  {
    accessorKey: 'treatment',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Treatment" />,
    cell: ({ row }) => {
      const treatment = row.getValue('treatment') as string
      return <div className="max-w-[200px] truncate">{treatment || '-'}</div>
    },
  },
  {
    accessorKey: 'doctor.user.name',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Doctor" />,
    cell: ({ row }) => {
      return <div>{row.original.doctor?.user?.name || 'Unknown'}</div>
    },
  },
  {
    id: 'actions',
    cell: ({ row, table }) => {
      return <MedicalRecordActions record={row.original} meta={table.options.meta} />
    },
  },
]
