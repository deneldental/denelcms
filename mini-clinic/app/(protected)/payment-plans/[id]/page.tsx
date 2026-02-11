import { notFound } from 'next/navigation'
import { getPaymentPlanDetails } from '@/lib/actions/payment-plans'
import { PaymentPlanDetailsContent } from '@/components/payment-plans/payment-plan-details-content'
import { getCurrentUser } from '@/lib/rbac'
import { checkPermission } from '@/lib/rbac'
import { MODULES, ACTIONS } from '@/lib/modules'

export default async function PaymentPlanPage({ params }: { params: Promise<{ id: string }> }) {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
        notFound()
    }

    const hasPermission = await checkPermission(currentUser.id, MODULES.PATIENTS, ACTIONS.READ)
    if (!hasPermission) {
        notFound()
    }

    const { id } = await params
    const result = await getPaymentPlanDetails(id)

    if (!result.success || !result.data) {
        notFound()
    }

    return <PaymentPlanDetailsContent plan={result.data} />
}
