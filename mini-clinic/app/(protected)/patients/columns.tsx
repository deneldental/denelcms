'use client'

import { useState } from 'react'
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
import { patients } from '@/lib/db/schema'
import { deletePatient } from '@/lib/actions/patients'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { DeleteConfirmationDialog } from '@/components/ui/delete-confirmation-dialog'
import { EditPatientDialog } from '@/components/patients/edit-patient-dialog'

export type Patient = typeof patients.$inferSelect

function PatientActions({ patient }: { patient: Patient }) {
  const router = useRouter()
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)

  const handleDelete = async () => {
    const result = await deletePatient(patient.id)
    if (result.success) {
      toast.success('Patient deleted successfully')
      router.refresh()
    } else {
      toast.error(result.error || 'Failed to delete patient')
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
              router.push(`/patients/${patient.id}`)
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
              setShowDeleteDialog(true)
            }}
            className="text-destructive"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <EditPatientDialog
        patient={patient}
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
      />

      <DeleteConfirmationDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        onConfirm={handleDelete}
        title="Delete Patient"
        description="Are you sure you want to delete this patient? This action cannot be undone."
        itemName={patient.name}
      />
    </>
  )
}

export const columns: ColumnDef<Patient>[] = [
  {
    accessorKey: 'name',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Name" />,
  },

  {
    accessorKey: 'phone',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Phone" />,
    cell: ({ row }) => {
      const phone = row.getValue('phone') as string
      return <div>{phone || '-'}</div>
    },
  },
  {
    accessorKey: 'gender',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Gender" />,
    cell: ({ row }) => {
      const gender = row.getValue('gender') as string
      return <div className="capitalize">{gender}</div>
    },
  },
  {
    accessorKey: 'dob',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Date of Birth" />,
    cell: ({ row }) => {
      const dob = row.getValue('dob') as Date
      return <div>{dob ? new Date(dob).toLocaleDateString() : '-'}</div>
    },
  },
  {
    accessorKey: 'isChild',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Type" />,
    cell: ({ row }) => {
      const isChild = row.getValue('isChild') as boolean
      return <div>{isChild ? 'Child' : 'Adult'}</div>
    },
  },
  {
    accessorKey: 'isOrtho',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Ortho" />,
    cell: ({ row }) => {
      const isOrtho = row.getValue('isOrtho') as boolean
      return <div>{isOrtho ? 'Yes' : 'No'}</div>
    },
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      return <PatientActions patient={row.original} />
    },
  },
]
