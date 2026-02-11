'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, Plus, X } from 'lucide-react'
import { toast } from 'sonner'
import { getPatients } from '@/lib/actions/patients'
import { sendSMS } from '@/lib/actions/sms'
import { patients } from '@/lib/db/schema'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

type Patient = typeof patients.$inferSelect

interface Recipient {
  phone: string
  message: string
  patientId?: string
  patientName?: string
}

export function BulkSMSTab() {
  const [isLoading, setIsLoading] = useState(false)
  const [patientsList, setPatientsList] = useState<Patient[]>([])
  const [from, setFrom] = useState('Framada')
  const [message, setMessage] = useState('')
  const [recipients, setRecipients] = useState<Recipient[]>([])
  const [selectedPatientId, setSelectedPatientId] = useState<string>('')

  useEffect(() => {
    let mounted = true
    const load = async () => {
      const result = await getPatients()
      if (mounted && result.success && result.data) {
        setPatientsList(result.data)
      }
    }
    load()
    return () => {
      mounted = false
    }
  }, [])

  const addRecipient = () => {
    if (!selectedPatientId) {
      toast.error('Please select a patient')
      return
    }

    const patient = patientsList.find((p) => p.id === selectedPatientId)
    if (!patient) return

    const contactPhone =
      patient.isChild && patient.guardianPhone ? patient.guardianPhone : patient.phone

    if (!contactPhone) {
      toast.error('Selected patient does not have a phone number')
      return
    }

    if (recipients.some((r) => r.phone === contactPhone)) {
      toast.error('Patient already added')
      return
    }

    setRecipients([
      ...recipients,
      {
        phone: contactPhone,
        message: message,
        patientId: patient.id,
        patientName: patient.name,
      },
    ])
    setSelectedPatientId('')
  }

  const removeRecipient = (phone: string) => {
    setRecipients(recipients.filter((r) => r.phone !== phone))
  }

  const updateRecipientMessage = (phone: string, newMessage: string) => {
    setRecipients(recipients.map((r) => (r.phone === phone ? { ...r, message: newMessage } : r)))
  }

  const handleSend = async () => {
    if (recipients.length === 0) {
      toast.error('Please add at least one recipient')
      return
    }

    if (!message.trim()) {
      toast.error('Please enter a message')
      return
    }

    setIsLoading(true)

    // Update all recipients with the current message if they don't have personalized messages
    const finalRecipients = recipients.map((r) => ({
      phone: r.phone,
      message: r.message || message,
      patientId: r.patientId,
    }))

    const result = await sendSMS(finalRecipients, from, 'bulk')

    setIsLoading(false)

    if (result.success) {
      toast.success(`SMS sent successfully to ${recipients.length} recipient(s)`)
      setRecipients([])
      setMessage('')
    } else {
      toast.error(result.error || 'Failed to send SMS')
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Bulk SMS</CardTitle>
          <CardDescription>Send personalized SMS messages to multiple recipients.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="from">From (Sender Name)</Label>
            <Input
              id="from"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              placeholder="Framada"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Message Template</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => {
                setMessage(e.target.value)
                // Update all recipients with the new message template
                setRecipients(recipients.map((r) => ({ ...r, message: e.target.value })))
              }}
              placeholder="Enter your message here..."
              rows={4}
            />
            <p className="text-xs text-muted-foreground">{message.length} characters</p>
          </div>

          <div className="space-y-2">
            <Label>Add Recipients</Label>
            <div className="flex gap-2">
              <Select value={selectedPatientId} onValueChange={setSelectedPatientId}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select a patient" />
                </SelectTrigger>
                <SelectContent>
                  {patientsList
                    .filter((p) => {
                      const phone = p.isChild && p.guardianPhone ? p.guardianPhone : p.phone
                      return phone && !recipients.some((r) => r.phone === phone)
                    })
                    .map((patient) => {
                      const phone =
                        patient.isChild && patient.guardianPhone
                          ? patient.guardianPhone
                          : patient.phone
                      return (
                        <SelectItem key={patient.id} value={patient.id}>
                          {patient.name} {phone && `(${phone})`}
                        </SelectItem>
                      )
                    })}
                </SelectContent>
              </Select>
              <Button onClick={addRecipient} type="button">
                <Plus className="h-4 w-4 mr-2" />
                Add
              </Button>
            </div>
          </div>

          {recipients.length > 0 && (
            <div className="space-y-2">
              <Label>Recipients ({recipients.length})</Label>
              <div className="space-y-2 max-h-[300px] overflow-y-auto border rounded-lg p-4">
                {recipients.map((recipient) => (
                  <div key={recipient.phone} className="flex gap-2 items-start p-2 border rounded">
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium">
                        {recipient.patientName || recipient.phone}
                      </p>
                      <Textarea
                        value={recipient.message}
                        onChange={(e) => updateRecipientMessage(recipient.phone, e.target.value)}
                        placeholder="Personalized message (optional)"
                        rows={2}
                        className="text-xs"
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeRecipient(recipient.phone)}
                      type="button"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Button
            onClick={handleSend}
            disabled={isLoading || recipients.length === 0}
            className="w-full"
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Send SMS to {recipients.length} {recipients.length === 1 ? 'Recipient' : 'Recipients'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
