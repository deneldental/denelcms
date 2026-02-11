import { getAuditLogs } from '@/lib/actions/audit-logs'
import { AuditLogsContent } from './audit-logs-content'
import { redirect } from 'next/navigation'

export default async function AuditLogsPage() {
  const result = await getAuditLogs(500)

  // If unauthorized, redirect to dashboard
  if (!result.success) {
    redirect('/dashboard')
  }

  const logs = result.data || []

  return <AuditLogsContent logs={logs} />
}
