'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Search, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { getSMSStatus, getSentSMSMessages, getPrepaidBalance } from '@/lib/actions/sms'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { format } from 'date-fns'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { smsMessages } from '@/lib/db/schema'

type SMSMessage = typeof smsMessages.$inferSelect & {
  patient?: { id: string; name: string } | null
}

interface HubtelBalanceData {
  balance?: number
  availableBalance?: number
  amount?: number
  currency?: string
  accountName?: string
  accountNumber?: string
}

interface HubtelStatusData {
  status?: string
  batchId?: string
  messageId?: string
  recipient?: string
  from?: string
  content?: string
  createdAt?: string
  sentAt?: string
  deliveredAt?: string
  messages?: Array<{
    recipient?: string
    To?: string
    status?: string
    messageId?: string
    sentAt?: string
  }>
}

export function SMSStatusTab() {
  const [isLoading, setIsLoading] = useState(false)
  const [loadingMessages, setLoadingMessages] = useState(true)
  const [loadingBalance, setLoadingBalance] = useState(false)
  const [messages, setMessages] = useState<SMSMessage[]>([])
  const [messageId, setMessageId] = useState('')
  const [isBatch, setIsBatch] = useState(false)
  const [statusData, setStatusData] = useState<HubtelStatusData | null>(null)
  const [checkingStatusFor, setCheckingStatusFor] = useState<string | null>(null)
  const [balanceData, setBalanceData] = useState<HubtelBalanceData | null>(null)
  const [balanceError, setBalanceError] = useState<string | null>(null)
  const [balanceErrorDetails, setBalanceErrorDetails] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    const loadData = async () => {
      // Inline loadMessages
      setLoadingMessages(true)
      const messagesResult = await getSentSMSMessages()

      // Inline loadBalance
      setLoadingBalance(true)
      setBalanceError(null)
      setBalanceErrorDetails(null)
      const balanceResult = await getPrepaidBalance()

      if (mounted) {
        setLoadingMessages(false)
        if (messagesResult.success && messagesResult.data) {
          setMessages(messagesResult.data)
        }

        setLoadingBalance(false)
        if (balanceResult.success && balanceResult.data) {
          setBalanceData(balanceResult.data)
        } else {
          setBalanceError(balanceResult.error || 'Failed to load prepaid balance')
          setBalanceErrorDetails(balanceResult.details || null)
        }
      }
    }
    loadData()
    return () => {
      mounted = false
    }
  }, [])

  const loadBalance = async () => {
    setLoadingBalance(true)
    setBalanceError(null)
    setBalanceErrorDetails(null)
    const result = await getPrepaidBalance()
    setLoadingBalance(false)

    if (result.success && result.data) {
      setBalanceData(result.data)
      setBalanceError(null)
      setBalanceErrorDetails(null)
    } else {
      // Store error message to display to user
      const errorMsg = result.error || 'Failed to load prepaid balance'
      setBalanceError(errorMsg)
      setBalanceErrorDetails(result.details || null)
      setBalanceData(null)
      console.warn('Failed to load prepaid balance:', {
        error: errorMsg,
        details: result.details,
        status: result.status,
      })
    }
  }

  const loadMessages = async () => {
    setLoadingMessages(true)
    const result = await getSentSMSMessages()
    setLoadingMessages(false)

    if (result.success && result.data) {
      setMessages(result.data)
    } else {
      toast.error(result.error || 'Failed to load sent SMS messages')
    }
  }

  const handleCheckStatus = async (smsMessage?: SMSMessage) => {
    const idToCheck = smsMessage
      ? smsMessage.batchId || smsMessage.messageId || ''
      : messageId.trim()

    if (!idToCheck) {
      toast.error('Please enter a Message ID or Batch ID, or select a message')
      return
    }

    const isBatchId = smsMessage ? !!smsMessage.batchId : isBatch
    setCheckingStatusFor(smsMessage?.id || null)
    setIsLoading(true)

    const result = await getSMSStatus(idToCheck, isBatchId)
    setIsLoading(false)
    setCheckingStatusFor(null)

    if (result.success && result.data) {
      setStatusData(result.data)
      toast.success('Status retrieved successfully')

      // Refresh messages to update status if needed
      loadMessages()
    } else {
      toast.error(result.error || 'Failed to retrieve status')
      setStatusData(null)
    }
  }

  const formatStatus = (status?: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
    if (!status) return 'outline'
    const statusColors: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      sent: 'default',
      delivered: 'default',
      failed: 'destructive',
      pending: 'secondary',
      queued: 'secondary',
    }
    return statusColors[status.toLowerCase()] || 'outline'
  }

  const getTypeBadgeVariant = (type?: string): 'default' | 'secondary' | 'outline' => {
    if (!type) return 'outline'
    const variants: Record<string, 'default' | 'secondary' | 'outline'> = {
      bulk: 'default',
      birthday: 'secondary',
      followup: 'outline',
    }
    return variants[type] || 'outline'
  }

  return (
    <div className="space-y-6">
      {/* Prepaid Balance Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Prepaid Balance</CardTitle>
              <CardDescription>Current SMS prepaid balance from Hubtel.</CardDescription>
            </div>
            <Button onClick={loadBalance} variant="outline" size="sm" disabled={loadingBalance}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loadingBalance ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loadingBalance ? (
            <div className="text-center py-8">
              <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
              <p className="text-muted-foreground">Loading balance...</p>
            </div>
          ) : balanceError ? (
            <div className="text-center py-8 border rounded-lg border-destructive/50 bg-destructive/5">
              <p className="text-destructive font-medium mb-2">Unable to load balance</p>
              <p className="text-sm text-muted-foreground mb-4">{balanceError}</p>
              {balanceError.includes('not configured') && (
                <div className="mt-4 text-xs text-muted-foreground space-y-1">
                  <p>
                    Please ensure the following environment variables are set in{' '}
                    <code className="bg-muted px-1 py-0.5 rounded">.env.local</code>:
                  </p>
                  <ul className="list-disc list-inside space-y-1 mt-2">
                    <li>
                      <code>HUBTEL_CLIENT_ID</code>
                    </li>
                    <li>
                      <code>HUBTEL_CLIENT_SECRET</code>
                    </li>
                    <li>
                      <code>PREPAID_DEPOSIT_ID</code>
                    </li>
                  </ul>
                </div>
              )}
              {(balanceError.includes('404') || balanceError.includes('not found')) && (
                <div className="mt-4 text-xs text-muted-foreground">
                  <p>Possible issues:</p>
                  <ul className="list-disc list-inside space-y-1 mt-2">
                    <li>The PREPAID_DEPOSIT_ID may be incorrect</li>
                    <li>The prepaid account may not exist in your Hubtel account</li>
                    <li>
                      Check your Hubtel dashboard at{' '}
                      <code className="bg-muted px-1 py-0.5 rounded">
                        https://app-site.hubtel.com/money/accounts
                      </code>
                    </li>
                  </ul>
                </div>
              )}
              {(balanceError.includes('401') || balanceError.includes('Authentication')) && (
                <div className="mt-4 text-xs text-muted-foreground">
                  <p>
                    Please verify your Hubtel API credentials are correct in{' '}
                    <code className="bg-muted px-1 py-0.5 rounded">.env.local</code>
                  </p>
                </div>
              )}
              {(balanceError.includes('Network') || balanceError.includes('connect')) && (
                <div className="mt-4 text-xs text-muted-foreground">
                  <p>Network connectivity issue. Please check:</p>
                  <ul className="list-disc list-inside space-y-1 mt-2">
                    <li>Your internet connection</li>
                    <li>Hubtel API service status</li>
                    <li>Firewall/proxy settings</li>
                  </ul>
                </div>
              )}
              {balanceErrorDetails && (
                <details className="mt-4 text-left">
                  <summary className="text-xs text-muted-foreground cursor-pointer">
                    View Error Details
                  </summary>
                  <pre className="mt-2 p-3 bg-muted rounded text-xs overflow-auto max-h-32">
                    {typeof balanceErrorDetails === 'string'
                      ? balanceErrorDetails
                      : JSON.stringify(balanceErrorDetails, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          ) : balanceData ? (
            <div className="space-y-4">
              {/* Try different possible balance field names */}
              {(balanceData.balance !== undefined ||
                balanceData.availableBalance !== undefined ||
                balanceData.amount !== undefined) && (
                  <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                    <span className="text-lg font-medium">Available Balance:</span>
                    <span className="text-2xl font-bold text-primary">
                      {(() => {
                        const balance =
                          balanceData.balance ??
                          balanceData.availableBalance ??
                          balanceData.amount ??
                          0
                        const currency = balanceData.currency || 'GHS'
                        if (typeof balance === 'number') {
                          // If balance is in smallest currency unit (cents/pesewas), divide by 100
                          const formattedBalance =
                            balance > 1000 ? (balance / 100).toFixed(2) : balance.toFixed(2)
                          return `${currency} ${formattedBalance}`
                        }
                        return `${currency} ${balance || '0.00'}`
                      })()}
                    </span>
                  </div>
                )}
              {balanceData.currency && (
                <div className="text-sm text-muted-foreground">
                  Currency: {balanceData.currency}
                </div>
              )}
              {balanceData.accountName && (
                <div className="text-sm text-muted-foreground">
                  Account: {balanceData.accountName}
                </div>
              )}
              {balanceData.accountNumber && (
                <div className="text-sm text-muted-foreground font-mono">
                  Account Number: {balanceData.accountNumber}
                </div>
              )}
              <details className="mt-4">
                <summary className="text-sm text-muted-foreground cursor-pointer">
                  View Raw Response
                </summary>
                <pre className="mt-2 p-3 bg-muted rounded text-xs overflow-auto max-h-64">
                  {JSON.stringify(balanceData, null, 2)}
                </pre>
              </details>
            </div>
          ) : (
            <div className="text-center py-8 border rounded-lg">
              <p className="text-muted-foreground">
                Unable to load balance. Please check configuration.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>SMS Status</CardTitle>
              <CardDescription>View and check the status of sent SMS messages.</CardDescription>
            </div>
            <Button onClick={loadMessages} variant="outline" size="sm" disabled={loadingMessages}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loadingMessages ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {loadingMessages ? (
            <div className="text-center py-8">
              <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
              <p className="text-muted-foreground">Loading sent SMS messages...</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-8 border rounded-lg">
              <p className="text-muted-foreground">No SMS messages sent yet.</p>
            </div>
          ) : (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Recipient</TableHead>
                    <TableHead>Patient</TableHead>
                    <TableHead>Message</TableHead>
                    <TableHead>Sent At</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Message ID</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {messages.map((sms) => (
                    <TableRow key={sms.id}>
                      <TableCell>
                        <Badge variant={getTypeBadgeVariant(sms.type)} className="capitalize">
                          {sms.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{sms.recipient}</TableCell>
                      <TableCell>{sms.patient?.name || '-'}</TableCell>
                      <TableCell className="max-w-[200px]">
                        <p className="truncate text-sm">{sms.content}</p>
                      </TableCell>
                      <TableCell>
                        {format(new Date(sms.sentAt), "MMM d, yyyy 'at' h:mm a")}
                      </TableCell>
                      <TableCell>
                        <Badge variant={formatStatus(sms.status)}>{sms.status}</Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {sms.batchId || sms.messageId || '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleCheckStatus(sms)}
                          disabled={isLoading && checkingStatusFor === sms.id}
                        >
                          {isLoading && checkingStatusFor === sms.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <Search className="h-4 w-4 mr-2" />
                              Check
                            </>
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Manual Status Check Card */}
      <Card>
        <CardHeader>
          <CardTitle>Manual Status Check</CardTitle>
          <CardDescription>
            Check status by entering a Message ID or Batch ID directly.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="message-id">Message ID / Batch ID</Label>
              <Input
                id="message-id"
                value={messageId}
                onChange={(e) => setMessageId(e.target.value)}
                placeholder="Enter message ID or batch ID"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="is-batch"
                checked={isBatch}
                onCheckedChange={(checked) => setIsBatch(checked === true)}
              />
              <Label htmlFor="is-batch" className="cursor-pointer">
                This is a Batch ID
              </Label>
            </div>

            <Button
              onClick={() => handleCheckStatus()}
              disabled={isLoading || !messageId.trim()}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Checking Status...
                </>
              ) : (
                <>
                  <Search className="mr-2 h-4 w-4" />
                  Check Status
                </>
              )}
            </Button>
          </div>

          {statusData && (
            <div className="space-y-4 mt-6">
              <div className="border rounded-lg p-4 space-y-3">
                <h3 className="font-semibold text-lg">Status Information</h3>

                {statusData.status && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">Status:</span>
                      <Badge variant={formatStatus(statusData.status)}>{statusData.status || '-'}</Badge>
                    </div>
                  </div>
                )}

                {statusData.batchId && (
                  <div className="space-y-2">
                    <div>
                      <span className="text-sm font-medium">Batch ID:</span>
                      <span className="ml-2 text-sm font-mono">{statusData.batchId}</span>
                    </div>
                  </div>
                )}

                {statusData.messageId && (
                  <div className="space-y-2">
                    <div>
                      <span className="text-sm font-medium">Message ID:</span>
                      <span className="ml-2 text-sm font-mono">{statusData.messageId}</span>
                    </div>
                  </div>
                )}

                {statusData.recipient && (
                  <div className="space-y-2">
                    <div>
                      <span className="text-sm font-medium">Recipient:</span>
                      <span className="ml-2 text-sm font-mono">{statusData.recipient}</span>
                    </div>
                  </div>
                )}

                {statusData.from && (
                  <div className="space-y-2">
                    <div>
                      <span className="text-sm font-medium">From:</span>
                      <span className="ml-2 text-sm">{statusData.from}</span>
                    </div>
                  </div>
                )}

                {statusData.content && (
                  <div className="space-y-2">
                    <div>
                      <span className="text-sm font-medium">Message:</span>
                      <p className="mt-1 text-sm text-muted-foreground">{statusData.content}</p>
                    </div>
                  </div>
                )}

                {statusData.createdAt && (
                  <div className="space-y-2">
                    <div>
                      <span className="text-sm font-medium">Created At:</span>
                      <span className="ml-2 text-sm">
                        {new Date(statusData.createdAt).toLocaleString()}
                      </span>
                    </div>
                  </div>
                )}

                {statusData.sentAt && (
                  <div className="space-y-2">
                    <div>
                      <span className="text-sm font-medium">Sent At:</span>
                      <span className="ml-2 text-sm">
                        {new Date(statusData.sentAt).toLocaleString()}
                      </span>
                    </div>
                  </div>
                )}

                {statusData.deliveredAt && (
                  <div className="space-y-2">
                    <div>
                      <span className="text-sm font-medium">Delivered At:</span>
                      <span className="ml-2 text-sm">
                        {new Date(statusData.deliveredAt).toLocaleString()}
                      </span>
                    </div>
                  </div>
                )}

                {statusData.messages &&
                  Array.isArray(statusData.messages) &&
                  statusData.messages.length > 0 && (
                    <div className="space-y-2 mt-4">
                      <span className="text-sm font-medium">Batch Messages:</span>
                      <div className="border rounded-lg mt-2">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Recipient</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Message ID</TableHead>
                              <TableHead>Sent At</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {statusData.messages.map((msg, index: number) => (
                              <TableRow key={index}>
                                <TableCell className="font-mono text-xs">
                                  {msg.recipient || msg.To || '-'}
                                </TableCell>
                                <TableCell>
                                  <Badge variant={formatStatus(msg.status)}>
                                    {msg.status || '-'}
                                  </Badge>
                                </TableCell>
                                <TableCell className="font-mono text-xs">
                                  {msg.messageId || '-'}
                                </TableCell>
                                <TableCell>
                                  {msg.sentAt ? new Date(msg.sentAt).toLocaleString() : '-'}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  )}

                <details className="mt-4">
                  <summary className="text-sm text-muted-foreground cursor-pointer">
                    View Raw Response
                  </summary>
                  <pre className="mt-2 p-3 bg-muted rounded text-xs overflow-auto max-h-64">
                    {JSON.stringify(statusData, null, 2)}
                  </pre>
                </details>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
