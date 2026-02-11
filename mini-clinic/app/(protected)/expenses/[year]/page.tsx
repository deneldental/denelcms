import { Suspense } from 'react'
import { getMonths } from '@/lib/finance-service'
import { PeriodCard } from '@/components/shared/period-card'
import { BreadcrumbNav } from '@/components/dashboard/breadcrumb-nav'

interface MonthsPageProps {
  params: Promise<{ year: string }>
}

export default async function MonthsPage({ params }: MonthsPageProps) {
  const { year } = await params
  const months = await getMonths(year)

  return (
    <div className="flex flex-col gap-6">
      <BreadcrumbNav />
      <div>
        <h1 className="text-lg font-semibold md:text-2xl">{year} Expenses</h1>
        <p className="text-muted-foreground">Select a month to view details.</p>
      </div>

      <Suspense fallback={<div>Loading months...</div>}>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {months.map((month) => (
            <PeriodCard
              key={month.id}
              title={month.name}
              total={month.total}
              href={`/expenses/${year}/${month.id}`}
            />
          ))}
        </div>
      </Suspense>
    </div>
  )
}
