'use client'

import { useState } from 'react'
import {
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { FileText, Download, Search } from 'lucide-react'
import { columns, type OrthoConsent } from './columns'
import { UploadConsentDialog } from '@/components/ortho-consent/upload-consent-dialog'
import { toast } from 'sonner'
import { deleteConsentForm } from '@/lib/actions/ortho-consent'
import { useRouter } from 'next/navigation'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface OrthoConsentContentProps {
  consentForms: OrthoConsent[]
  canEdit?: boolean
}

export function OrthoConsentContent({ consentForms, canEdit = true }: OrthoConsentContentProps) {
  const router = useRouter()
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = useState({})
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false)
  const [selectedPatient, setSelectedPatient] = useState<OrthoConsent | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [patientToDelete, setPatientToDelete] = useState<OrthoConsent | null>(null)

  const handleDownloadTemplate = async () => {
    try {
      toast.loading('Generating template...')

      const response = await fetch('/api/ortho-consent/template')

      if (!response.ok) {
        throw new Error('Failed to download template')
      }

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'ortho-consent-form-template.pdf'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      toast.dismiss()
      toast.success('Template downloaded successfully')
    } catch (error) {
      toast.dismiss()
      toast.error('Failed to download template')
      console.error('Download error:', error)
    }
  }

  const handleUpload = (patient: OrthoConsent) => {
    setSelectedPatient(patient)
    setUploadDialogOpen(true)
  }

  const handleDelete = (patient: OrthoConsent) => {
    setPatientToDelete(patient)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!patientToDelete) return

    const result = await deleteConsentForm(patientToDelete.id)

    if (result.success) {
      toast.success('Consent form deleted successfully')
      router.refresh()
    } else {
      toast.error(result.error || 'Failed to delete consent form')
    }

    setDeleteDialogOpen(false)
    setPatientToDelete(null)
  }

  const table = useReactTable({
    data: consentForms,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
    meta: {
      onUpload: canEdit ? handleUpload : undefined,
      onDelete: canEdit ? handleDelete : undefined,
      onView: (patient: OrthoConsent) => router.push(`/ortho-consent/${patient.id}`),
      canEdit: canEdit,
    },
  })

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Ortho Consent Forms</h1>
          <p className="text-muted-foreground">
            Manage consent forms for orthodontic treatment patients
          </p>
        </div>
        <Button onClick={handleDownloadTemplate} variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Download Template
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search patients..."
            value={(table.getColumn('name')?.getFilterValue() as string) ?? ''}
            onChange={(event) => table.getColumn('name')?.setFilterValue(event.target.value)}
            className="max-w-sm pl-10"
          />
        </div>
        <Select
          value={(table.getColumn('status')?.getFilterValue() as string) ?? 'all'}
          onValueChange={(value) => {
            if (value === 'all') {
              table.getColumn('status')?.setFilterValue(undefined)
            } else {
              table.getColumn('status')?.setFilterValue(value)
            }
          }}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="signed">Signed</SelectItem>
            <SelectItem value="unsigned">Unsigned</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && 'selected'}
                  onClick={() => router.push(`/ortho-consent/${row.original.id}`)}
                  className="cursor-pointer hover:bg-muted/50"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  <div className="flex flex-col items-center justify-center text-muted-foreground">
                    <FileText className="h-12 w-12 mb-2 opacity-50" />
                    <p>No ortho patients found</p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between space-x-2 py-4">
        <div className="flex-1 text-sm text-muted-foreground">
          {table.getFilteredRowModel().rows.length} patient(s) total
        </div>
        <div className="space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
          </Button>
        </div>
      </div>

      <UploadConsentDialog
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
        patient={selectedPatient}
        onSuccess={() => router.refresh()}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Consent Form</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the consent form for{' '}
              <strong>{patientToDelete?.name}</strong>? This will mark the status as unsigned and
              remove the uploaded file.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
