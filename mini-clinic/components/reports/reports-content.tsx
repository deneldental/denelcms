'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/data-table/data-table'
import { dailyReportColumns, DailyReport } from '@/app/(protected)/reports/columns'
import { AddReportDialog } from '@/components/reports/add-report-dialog'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

interface ReportsContentProps {
  reports: DailyReport[]
  submittedBy: string
}

export function ReportsContent({ reports, submittedBy }: ReportsContentProps) {
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    // Show loader briefly to ensure content is ready
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 50)
    return () => clearTimeout(timer)
  }, [])

  const handleSuccess = () => {
    router.refresh()
  }

  const handleRowClick = (report: DailyReport) => {
    router.push(`/reports/${report.id}`)
  }

  // Add onRowClick handler to each report for row click functionality
  const reportsWithClick = reports.map((report) => ({
    ...report,
    onRowClick: () => handleRowClick(report),
  }))

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
          <p className="text-muted-foreground">Submit and review daily reports.</p>
        </div>
        <Button onClick={() => setOpen(true)}>Add New Report</Button>
        <AddReportDialog
          open={open}
          onOpenChange={setOpen}
          submittedBy={submittedBy}
          onSuccess={handleSuccess}
        />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8 border-t">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Loading reports...</span>
          </div>
        </div>
      ) : (
        <DataTable
          columns={dailyReportColumns}
          data={reportsWithClick}
          meta={{ onRowClick: handleRowClick }}
        />
      )}
    </div>
  )
}
