import { getDailyReportById } from '@/lib/actions/reports'
import { notFound } from 'next/navigation'
import { ReportDetailContent } from '@/components/reports/report-detail-content'
import { DailyReport } from '../columns'

export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const reportResult = await getDailyReportById(id)

  if (!reportResult.success || !reportResult.data) {
    notFound()
  }

  const report = reportResult.data as DailyReport

  return <ReportDetailContent report={report} />
}
