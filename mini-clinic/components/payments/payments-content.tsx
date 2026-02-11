'use client'

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/data-table/data-table'
import {
  oneTimePaymentColumns,
  planPaymentColumns,
  activePaymentPlanColumns,
  Payment,
  PaymentPlan,
} from '@/app/(protected)/payments/columns'
import { AcceptPaymentDialog } from '@/components/payments/accept-payment-dialog'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'

// Dynamically import the icon to avoid SSR issues
const Plus = dynamic(() => import('lucide-react').then((mod) => mod.Plus), {
  ssr: false,
  loading: () => <span className="mr-2">+</span>,
})

interface PaymentsContentProps {
  oneTimePayments: Payment[]
  planPayments: Payment[]
  activePlans: PaymentPlan[]
  overduePlans: PaymentPlan[]
  outstandingPlans: PaymentPlan[]
}

export function PaymentsContent({
  oneTimePayments,
  planPayments,
  activePlans,
  overduePlans,
  outstandingPlans,
}: PaymentsContentProps) {
  const [showAcceptDialog, setShowAcceptDialog] = useState(false)
  const router = useRouter()

  const handlePaymentSuccess = () => {
    router.refresh()
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Payments</h1>
          <p className="text-muted-foreground">Track patient payments and invoices.</p>
        </div>
        <Button onClick={() => setShowAcceptDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Accept Payment
        </Button>
        <AcceptPaymentDialog
          open={showAcceptDialog}
          onOpenChange={setShowAcceptDialog}
          onSuccess={handlePaymentSuccess}
        />
      </div>

      <Tabs defaultValue="active-plans" className="w-full">
        <TabsList>
          <TabsTrigger value="active-plans">Active Plans</TabsTrigger>
          <TabsTrigger value="one-time">One-time Payments</TabsTrigger>
          <TabsTrigger value="transactions">Plan Transactions</TabsTrigger>
          <TabsTrigger value="overdue">Overdue Payments</TabsTrigger>
          <TabsTrigger value="outstanding">Outstanding</TabsTrigger>
        </TabsList>

        <TabsContent value="active-plans">
          <DataTable
            columns={activePaymentPlanColumns}
            data={activePlans}
            initialColumnVisibility={{
              patientId: false,
              status: false,
            }}
          />
        </TabsContent>

        <TabsContent value="one-time">
          <DataTable
            columns={oneTimePaymentColumns}
            data={oneTimePayments}
            initialColumnVisibility={{
              additionalNotes: false,
            }}
          />
        </TabsContent>

        <TabsContent value="transactions">
          <DataTable
            columns={planPaymentColumns}
            data={planPayments}
            initialColumnVisibility={{
              additionalNotes: false,
            }}
          />
        </TabsContent>

        <TabsContent value="overdue">
          <DataTable
            columns={activePaymentPlanColumns}
            data={overduePlans}
            initialColumnVisibility={{
              patientId: false,
              status: false,
              createdAt: false,
            }}
          />
        </TabsContent>

        <TabsContent value="outstanding">
          <DataTable
            columns={activePaymentPlanColumns}
            data={outstandingPlans}
            initialColumnVisibility={{
              patientId: false,
              status: false,
              createdAt: false,
            }}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
