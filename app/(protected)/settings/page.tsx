export const runtime = 'edge';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { PaymentPlanTemplatesSection } from '@/components/settings/payment-plan-templates-section'
import { UnitsSection } from '@/components/settings/units-section'
import { CategoriesSection } from '@/components/settings/categories-section'
import { AppointmentTypesSection } from '@/components/settings/appointment-types-section'
import { ExpenseCategoriesSection } from '@/components/settings/expense-categories-section'
import { PaymentMethodsSection } from '@/components/settings/payment-methods-section'
import { TreatmentTypesSection } from '@/components/settings/treatment-types-section'
import { DatabaseManagementSection } from '@/components/settings/database-management-section'
import { getCurrentUser } from '@/lib/rbac'
import { getUserRole } from '@/lib/actions/users'

export default async function SettingsPage() {
  const currentUser = await getCurrentUser()
  const userRoleResult = currentUser
    ? await getUserRole(currentUser.id)
    : { success: false, error: 'Not authenticated' }
  const userRole = userRoleResult.success && 'data' in userRoleResult ? userRoleResult.data : null
  const isAdmin = userRole === 'admin'

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Manage application settings and configurations.</p>
      </div>

      <Accordion type="single" collapsible className="w-full" defaultValue="payment-plans">
        <AccordionItem value="payment-plans">
          <AccordionTrigger>Payment Plan Templates</AccordionTrigger>
          <AccordionContent>
            <PaymentPlanTemplatesSection />
          </AccordionContent>
        </AccordionItem>
        {isAdmin && (
          <>
            <AccordionItem value="appointment-types">
              <AccordionTrigger>Appointment Types</AccordionTrigger>
              <AccordionContent>
                <AppointmentTypesSection />
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="treatment-types">
              <AccordionTrigger>Treatment Types</AccordionTrigger>
              <AccordionContent>
                <TreatmentTypesSection />
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="expense-categories">
              <AccordionTrigger>Expense Categories</AccordionTrigger>
              <AccordionContent>
                <ExpenseCategoriesSection />
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="payment-methods">
              <AccordionTrigger>Payment Methods</AccordionTrigger>
              <AccordionContent>
                <PaymentMethodsSection />
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="units">
              <AccordionTrigger>Units</AccordionTrigger>
              <AccordionContent>
                <UnitsSection />
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="categories">
              <AccordionTrigger>Categories</AccordionTrigger>
              <AccordionContent>
                <CategoriesSection />
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="database">
              <AccordionTrigger>Database Management</AccordionTrigger>
              <AccordionContent>
                <DatabaseManagementSection />
              </AccordionContent>
            </AccordionItem>
          </>
        )}
      </Accordion>
    </div>
  )
}

