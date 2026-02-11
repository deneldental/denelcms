'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, Send } from 'lucide-react'
import { toast } from 'sonner'
import { getUpcomingBirthdays, sendSMS } from '@/lib/actions/sms'
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

interface BirthdayPatient {
  patientId: string
  patientName: string
  phone: string | null
  dateOfBirth: Date | null
  birthdayDate: string
  daysUntil: number
  age: number
}

export function BirthdaySMSTab() {
  const [isLoading, setIsLoading] = useState(false)
  const [loadingBirthdays, setLoadingBirthdays] = useState(true)
  const [birthdays, setBirthdays] = useState<BirthdayPatient[]>([])
  const [from, setFrom] = useState('Framada')
  const [messageTemplate, setMessageTemplate] = useState(
    'Happy Birthday {{name}}! Wishing you a wonderful day filled with joy and happiness. - Framada Clinic'
  )
  const [sendingTo, setSendingTo] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    const load = async () => {
      // setLoadingBirthdays is already true by default
      const result = await getUpcomingBirthdays()
      if (mounted) {
        setLoadingBirthdays(false)
        if (result.success && result.data) {
          setBirthdays(result.data)
        } else {
          toast.error(result.error || 'Failed to load upcoming birthdays')
        }
      }
    }
    load()
    return () => {
      mounted = false
    }
  }, [])



  const generateMessage = (patient: BirthdayPatient) => {
    return messageTemplate
      .replace(/{{name}}/g, patient.patientName)
      .replace(/{{age}}/g, patient.age.toString())
  }

  const handleSend = async (patient: BirthdayPatient) => {
    if (!patient.phone) {
      toast.error('Patient does not have a phone number')
      return
    }

    setSendingTo(patient.patientId)
    setIsLoading(true)

    const message = generateMessage(patient)
    const result = await sendSMS(
      [{ phone: patient.phone, message, patientId: patient.patientId }],
      from,
      'birthday'
    )

    setIsLoading(false)
    setSendingTo(null)

    if (result.success) {
      toast.success(`Birthday SMS sent to ${patient.patientName}`)
      // Remove from list after sending
      setBirthdays(birthdays.filter((b) => b.patientId !== patient.patientId))
    } else {
      toast.error(result.error || 'Failed to send SMS')
    }
  }

  const handleSendAll = async () => {
    const patientsWithPhone = birthdays.filter((b) => b.phone)

    if (patientsWithPhone.length === 0) {
      toast.error('No patients with phone numbers to send SMS')
      return
    }

    setIsLoading(true)

    const recipients = patientsWithPhone.map((patient) => ({
      phone: patient.phone!,
      message: generateMessage(patient),
      patientId: patient.patientId,
    }))

    const result = await sendSMS(recipients, from, 'birthday')

    setIsLoading(false)

    if (result.success) {
      toast.success(`Birthday SMS sent to ${recipients.length} patient(s)`)
      setBirthdays([])
    } else {
      toast.error(result.error || 'Failed to send SMS')
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Birthday SMS</CardTitle>
          <CardDescription>
            Send birthday wishes to patients with upcoming birthdays (next 30 days).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="from-birthday">From (Sender Name)</Label>
            <Input
              id="from-birthday"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              placeholder="Framada"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="message-template">Message Template</Label>
            <Textarea
              id="message-template"
              value={messageTemplate}
              onChange={(e) => setMessageTemplate(e.target.value)}
              placeholder="Happy Birthday {{name}}! ..."
              rows={4}
            />
            <p className="text-xs text-muted-foreground">
              Use {'{{name}}'} for patient name and {'{{age}}'} for age. {messageTemplate.length}{' '}
              characters.
            </p>
          </div>

          {loadingBirthdays ? (
            <div className="text-center py-8">
              <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
              <p className="text-muted-foreground">Loading upcoming birthdays...</p>
            </div>
          ) : birthdays.length === 0 ? (
            <div className="text-center py-8 border rounded-lg">
              <p className="text-muted-foreground">No upcoming birthdays in the next 30 days.</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {birthdays.length} upcoming {birthdays.length === 1 ? 'birthday' : 'birthdays'}
                </p>
                <Button
                  onClick={handleSendAll}
                  disabled={isLoading || birthdays.filter((b) => b.phone).length === 0}
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
                      <TableHead>Birthday</TableHead>
                      <TableHead>Days Until</TableHead>
                      <TableHead>Age</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {birthdays.map((patient) => (
                      <TableRow key={patient.patientId}>
                        <TableCell className="font-medium">{patient.patientName}</TableCell>
                        <TableCell>
                          {format(new Date(patient.birthdayDate), 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell>
                          <Badge variant={patient.daysUntil === 0 ? 'default' : 'secondary'}>
                            {patient.daysUntil === 0
                              ? 'Today'
                              : `${patient.daysUntil} day${patient.daysUntil === 1 ? '' : 's'}`}
                          </Badge>
                        </TableCell>
                        <TableCell>{patient.age} years</TableCell>
                        <TableCell>
                          {patient.phone || <span className="text-muted-foreground">No phone</span>}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            onClick={() => handleSend(patient)}
                            disabled={
                              isLoading || !patient.phone || sendingTo === patient.patientId
                            }
                          >
                            {isLoading && sendingTo === patient.patientId ? (
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
