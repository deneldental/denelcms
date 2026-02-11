export const runtime = 'edge';

import { getPayments } from '@/lib/actions/payments'
import {
  getAllPaymentPlans,
  getOverduePaymentPlans,
  getOutstandingPaymentPlans,
} from '@/lib/actions/payment-plans'
import { PaymentsContent } from '@/components/payments/payments-content'

export default async function PaymentsPage() {
  const [paymentsResult, plansResult, overdueResult, outstandingResult] = await Promise.all([
    getPayments(),
    getAllPaymentPlans(),
    getOverduePaymentPlans(),
    getOutstandingPaymentPlans(),
  ])

  const allPayments = paymentsResult.success ? paymentsResult.data : []
  const activePlans = plansResult.success ? plansResult.data : []
  const overduePlans = overdueResult.success ? overdueResult.data : []
  const outstandingPlans = outstandingResult.success ? outstandingResult.data : []

  // Separate one-time payments from payment plan payments
  const oneTimePayments = allPayments.filter((p) => !p.paymentPlanId)
  const planPayments = allPayments.filter((p) => p.paymentPlanId)

  return (
    <PaymentsContent
      oneTimePayments={oneTimePayments}
      planPayments={planPayments}
      activePlans={activePlans}
      overduePlans={overduePlans}
      outstandingPlans={outstandingPlans}
    />
  )
}
