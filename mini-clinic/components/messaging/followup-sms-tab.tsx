'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, Send } from 'lucide-react'
import { toast } from 'sonner'
import { getFollowupAppointments, sendSMS } from '@/lib/actions/sms'
import { format } from 'date-fns'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface FollowupAppointment {
  appointmentId: string
  patientId: string
  patientName: string
  phone: string | null
  appointmentDate: Date
  appointmentType: string
}

export function FollowupSMSTab() {
  const [isLoading, setIsLoading] = useState(false)
  const [loadingAppointments, setLoadingAppointments] = useState(true)
  const [appointments, setAppointments] = useState<FollowupAppointment[]>([])
  const [from, setFrom] = useState('Framada')
  const [messageTemplate, setMessageTemplate] = useState(
    'Hello {{name}}, this is a follow-up from your recent {{type}} appointment on {{date}}. How are you feeling? Please reply if you have any concerns. - Framada Clinic'
  )
  const [sendingTo, setSendingTo] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    const load = async () => {
      // loadingAppointments is already true by default
      const result = await getFollowupAppointments()
      if (mounted) {
        setLoadingAppointments(false)
        if (result.success && result.data) {
          setAppointments(result.data)
        } else {
          toast.error(result.error || 'Failed to load follow-up appointments')
        }
      }
    }
    load()
    return () => {
      mounted = false
    }
  }, [])

  const generateMessage = (appointment: FollowupAppointment) => {
    return messageTemplate
      .replace(/{{name}}/g, appointment.patientName)
      .replace(/{{type}}/g, appointment.appointmentType)
      .replace(/{{date}}/g, format(new Date(appointment.appointmentDate), 'MMM d, yyyy'))
  }

  const handleSend = async (appointment: FollowupAppointment) => {
    if (!appointment.phone) {
      toast.error('Patient does not have a phone number')
      return
    }

    setSendingTo(appointment.appointmentId)
    setIsLoading(true)

    const message = generateMessage(appointment)
    const result = await sendSMS(
      [{ phone: appointment.phone, message, patientId: appointment.patientId }],
      from,
      'followup'
    )

    setIsLoading(false)
    setSendingTo(null)

    if (result.success) {
      toast.success(`Follow-up SMS sent to ${appointment.patientName}`)
      // Remove from list after sending
      setAppointments(appointments.filter((a) => a.appointmentId !== appointment.appointmentId))
    } else {
      toast.error(result.error || 'Failed to send SMS')
    }
  }

  const handleSendAll = async () => {
    const appointmentsWithPhone = appointments.filter((a) => a.phone)

    if (appointmentsWithPhone.length === 0) {
      toast.error('No appointments with phone numbers to send SMS')
      return
    }

    setIsLoading(true)

    const recipients = appointmentsWithPhone.map((appointment) => ({
      phone: appointment.phone!,
      message: generateMessage(appointment),
      patientId: appointment.patientId,
    }))

    const result = await sendSMS(recipients, from, 'followup')

    setIsLoading(false)

    if (result.success) {
      toast.success(`Follow-up SMS sent to ${recipients.length} patient(s)`)
      setAppointments([])
    } else {
      toast.error(result.error || 'Failed to send SMS')
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Follow-up SMS</CardTitle>
          <CardDescription>
            Send follow-up messages to patients who completed appointments in the last 7 days.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="from-followup">From (Sender Name)</Label>
            <Input
              id="from-followup"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              placeholder="Framada"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="message-template-followup">Message Template</Label>
            <Textarea
              id="message-template-followup"
              value={messageTemplate}
              onChange={(e) => setMessageTemplate(e.target.value)}
              placeholder="Hello {{name}}, this is a follow-up..."
              rows={4}
            />
            <p className="text-xs text-muted-foreground">
              Use {'{{name}}'} for patient name, {'{{type}}'} for appointment type, and {'{{date}}'}{' '}
              for appointment date. {messageTemplate.length} characters.
            </p>
          </div>

          {loadingAppointments ? (
            <div className="text-center py-8">
              <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
              <p className="text-muted-foreground">Loading follow-up appointments...</p>
            </div>
          ) : appointments.length === 0 ? (
            <div className="text-center py-8 border rounded-lg">
              <p className="text-muted-foreground">No completed appointments in the last 7 days.</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {appointments.length} {appointments.length === 1 ? 'appointment' : 'appointments'}{' '}
                  for follow-up
                </p>
                <Button
                  onClick={handleSendAll}
                  disabled={isLoading || appointments.filter((a) => a.phone).length === 0}
                  size="sm"
                >
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Send All
                </Button>
              </div>

              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Patient</TableHead>
                      <TableHead>Appointment Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {appointments.map((appointment) => (
                      <TableRow key={appointment.appointmentId}>
                        <TableCell className="font-medium">{appointment.patientName}</TableCell>
                        <TableCell>
                          {format(new Date(appointment.appointmentDate), "MMM d, yyyy 'at' h:mm a")}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {appointment.appointmentType}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {appointment.phone || (
                            <span className="text-muted-foreground">No phone</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            onClick={() => handleSend(appointment)}
                            disabled={
                              isLoading ||
                              !appointment.phone ||
                              sendingTo === appointment.appointmentId
                            }
                          >
                            {isLoading && sendingTo === appointment.appointmentId ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <Send className="h-4 w-4 mr-2" />
                                Send
                              </>
                            )}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
