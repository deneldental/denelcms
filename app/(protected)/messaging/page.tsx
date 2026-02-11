export const runtime = 'edge';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { BulkSMSTab } from '@/components/messaging/bulk-sms-tab'
import { BirthdaySMSTab } from '@/components/messaging/birthday-sms-tab'
import { FollowupSMSTab } from '@/components/messaging/followup-sms-tab'
import { SMSStatusTab } from '@/components/messaging/sms-status-tab'
import { FailedSMSTab } from '@/components/messaging/failed-sms-tab'

export default function MessagingPage() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Messaging</h1>
        <p className="text-muted-foreground">Send SMS messages to patients via Hubtel.</p>
      </div>

      <Tabs defaultValue="bulk" className="w-full">
        <TabsList>
          <TabsTrigger value="bulk">Bulk SMS</TabsTrigger>
          <TabsTrigger value="birthday">Birthday SMS</TabsTrigger>
          <TabsTrigger value="followup">Follow-up SMS</TabsTrigger>
          <TabsTrigger value="status">SMS Status</TabsTrigger>
          <TabsTrigger value="failed">Failed SMS</TabsTrigger>
        </TabsList>
        <TabsContent value="bulk">
          <BulkSMSTab />
        </TabsContent>
        <TabsContent value="birthday">
          <BirthdaySMSTab />
        </TabsContent>
        <TabsContent value="followup">
          <FollowupSMSTab />
        </TabsContent>
        <TabsContent value="status">
          <SMSStatusTab />
        </TabsContent>
        <TabsContent value="failed">
          <FailedSMSTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
