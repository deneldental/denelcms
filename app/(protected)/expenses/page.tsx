export const runtime = 'edge';

import { getExpenses } from '@/lib/actions/expenses'
import { ExpensesClient } from './expenses-client'

export default async function ExpensesPage() {
  const result = await getExpenses()
  const expenses = result.success ? result.data : []

  return <ExpensesClient expenses={expenses || []} />
}
