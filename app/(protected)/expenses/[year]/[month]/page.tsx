import { Suspense } from 'react'
import { getWeeks } from '@/lib/finance-service'
import { PeriodCard } from '@/components/shared/period-card'
import { BreadcrumbNav } from '@/components/dashboard/breadcrumb-nav'

interface WeeksPageProps {
  params: Promise<{ year: string; month: string }>
}

export default async function WeeksPage({ params }: WeeksPageProps) {
  const { year, month } = await params
  const weeks = await getWeeks(year, month)

  // Capitalize month for display
  const displayMonth = month.charAt(0).toUpperCase() + month.slice(1)

  return (
    <div className="flex flex-col gap-6">
      <BreadcrumbNav />
      <div>
        <h1 className="text-lg font-semibold md:text-2xl">
          {displayMonth} {year} Expenses
        </h1>
        <p className="text-muted-foreground">Select a week to view transactions.</p>
      </div>

      <Suspense fallback={<div>Loading weeks...</div>}>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {weeks.map((week) => (
            <PeriodCard
              key={week.id}
              title={week.name}
              total={week.total}
              href={`/expenses/${year}/${month}/${week.id}`}
              subtext={week.range}
            />
          ))}
        </div>
      </Suspense>
    </div>
  )
}
