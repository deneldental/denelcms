'use client'

import { DataTable } from '@/components/data-table/data-table'
import { columns } from './columns'
import { type Expense } from './columns'
import { AddExpenseDialog } from '@/components/expenses/add-expense-dialog'
import { useRouter } from 'next/navigation'

interface ExpensesClientProps {
  expenses: Expense[]
}

export function ExpensesClient({ expenses }: ExpensesClientProps) {
  const router = useRouter()

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Expenses</h1>
          <p className="text-muted-foreground">Manage clinic operational expenses.</p>
        </div>
        <AddExpenseDialog />
      </div>

      <DataTable
        columns={columns}
        data={expenses}
        initialColumnVisibility={{
          description: false,
        }}
        meta={{
          onRowClick: (expense: Expense) => {
            router.push(`/expenses/view/${expense.id}`)
          },
        }}
      />
    </div>
  )
}
