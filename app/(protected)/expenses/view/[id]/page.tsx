import { getExpense } from '@/lib/actions/expenses'
import { notFound } from 'next/navigation'
import { ExpenseDetailContent } from '@/components/expenses/expense-detail-content'

export default async function ExpenseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const result = await getExpense(id)

  if (!result.success || !result.data) {
    notFound()
  }

  return <ExpenseDetailContent expense={result.data} />
}
