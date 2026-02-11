'use client'

import { useState, useEffect } from 'react'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Loader2, RefreshCw } from 'lucide-react'
import { getFailedSMSMessages, retrySMS } from '@/lib/actions/sms'
import { toast } from 'sonner'
import { format } from 'date-fns'

interface FailedMessage {
    id: string
    createdAt: Date
    recipient: string
    content: string
    status: string
    patient: {
        id: string
        name: string | null
    } | null
}

export function FailedSMSTab() {
    const [messages, setMessages] = useState<FailedMessage[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [retryingIds, setRetryingIds] = useState<Set<string>>(new Set())

    const loadMessages = async () => {
        setIsLoading(true)
        const result = await getFailedSMSMessages()
        if (result.success && result.data) {
            setMessages(result.data as FailedMessage[])
        } else {
            toast.error(result.error || 'Failed to load messages')
        }
        setIsLoading(false)
    }

    useEffect(() => {
        loadMessages()
    }, [])

    const handleRetry = async (messageId: string) => {
        setRetryingIds((prev) => new Set(prev).add(messageId))

        try {
            const result = await retrySMS(messageId)

            if (result.success) {
                toast.success('SMS retried successfully')
                // Refresh list to remove the retried message
                loadMessages()
            } else {
                toast.error(result.error || 'Failed to retry SMS')
            }
        } catch {
            toast.error('An error occurred during retry')
        } finally {
            setRetryingIds((prev) => {
                const next = new Set(prev)
                next.delete(messageId)
                return next
            })
        }
    }

    if (isLoading) {
        return (
            <div className="flex h-[200px] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold">Failed Messages</h2>
                <Button variant="outline" size="sm" onClick={loadMessages}>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Refresh
                </Button>
            </div>

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Recipient</TableHead>
                            <TableHead className="w-[40%]">Message</TableHead>
                            <TableHead className="text-right">Action</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {messages.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={4} className="h-24 text-center">
                                    No failed messages found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            messages.map((msg) => (
                                <TableRow key={msg.id}>
                                    <TableCell>
                                        {format(new Date(msg.createdAt), 'MMM d, yyyy HH:mm')}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="font-medium">
                                                {msg.patient?.name || 'Unknown Patient'}
                                            </span>
                                            <span className="text-xs text-muted-foreground">
                                                {msg.recipient}
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="break-words">
                                        {msg.content}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button
                                            size="sm"
                                            onClick={() => handleRetry(msg.id)}
                                            disabled={retryingIds.has(msg.id)}
                                        >
                                            {retryingIds.has(msg.id) ? (
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            ) : (
                                                <RefreshCw className="mr-2 h-4 w-4" />
                                            )}
                                            Retry
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}
