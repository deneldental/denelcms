import { WeekExpensesTable } from '@/components/expenses/week-expenses-table'
import { columns, Expense } from '../../../columns'
import { BreadcrumbNav } from '@/components/dashboard/breadcrumb-nav'

// Using same mock data for now, but in real app would filter by week ID
const data: Expense[] = [
  {
    id: '728ed52f',
    category: 'office',
    amount: 10000,
    date: new Date('2023-01-01'),
    description: 'Office Supplies',
    paidTo: 'Supplier A',
    paymentMethod: 'cash',
    createdAt: new Date('2023-01-01'),
  },
  {
    id: '489e1d42',
    category: 'software',
    amount: 12500,
    date: new Date('2023-01-05'),
    description: 'Software License',
    paidTo: 'Tech Vendor',
    paymentMethod: 'card',
    createdAt: new Date('2023-01-05'),
  },
  {
    id: '629e1d42',
    category: 'equipment',
    amount: 45000,
    date: new Date('2023-01-10'),
    description: 'Equipment Maintenance',
    paidTo: 'Service Provider',
    paymentMethod: 'transfer',
    createdAt: new Date('2023-01-10'),
  },
  {
    id: '629e1d45',
    category: 'other',
    amount: 1500,
    date: new Date('2023-01-11'),
    description: 'Coffee',
    paidTo: null,
    paymentMethod: 'cash',
    createdAt: new Date('2023-01-11'),
  },
]

interface WeekExpensesPageProps {
  params: Promise<{ year: string; month: string; week: string }>
}

export default async function WeekExpensesPage({ params }: WeekExpensesPageProps) {
  const { year, month, week } = await params
  const displayMonth = month.charAt(0).toUpperCase() + month.slice(1)

  return (
    <div className="flex flex-col gap-6">
      <BreadcrumbNav />
      <div>
        <h1 className="text-lg font-semibold md:text-2xl">Week {week} Expenses</h1>
        <p className="text-muted-foreground">
          {displayMonth} {year}
        </p>
      </div>

      <div className="rounded-lg border border-dashed shadow-sm p-4 h-[600px] flex flex-col">
        <WeekExpensesTable columns={columns} data={data} />
      </div>
    </div>
  )
}
