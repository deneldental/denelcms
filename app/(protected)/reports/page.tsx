import { ReportsContent } from '@/components/reports/reports-content'
import { getCurrentUser } from '@/lib/rbac'
import { db } from '@/lib/db'
import { user } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { getDailyReports } from '@/lib/actions/reports'
import { DailyReport } from './columns'

export default async function ReportsPage() {
  const currentUser = await getCurrentUser()
  let submittedBy = 'Unknown User'

  if (currentUser?.id) {
    const dbUser = await db.query.user.findFirst({
      where: eq(user.id, currentUser.id),
      columns: {
        name: true,
        email: true,
      },
    })
    submittedBy = dbUser?.name || dbUser?.email || submittedBy
  }

  const reportsResult = await getDailyReports()
  const reports: DailyReport[] = reportsResult.success ? (reportsResult.data as DailyReport[]) : []

  return <ReportsContent reports={reports} submittedBy={submittedBy} />
}
