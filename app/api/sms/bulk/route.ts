export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { checkPermission, getCurrentUser } from '@/lib/rbac'
import { MODULES, ACTIONS } from '@/lib/modules'

interface PersonalizedRecipient {
  To: string
  Content: string
}

interface BulkSMSRequest {
  From: string
  personalizedRecipients: PersonalizedRecipient[]
}

export async function POST(request: NextRequest) {
  try {
    // Authentication check
    const session = await auth.api.getSession({
      headers: await headers(),
    })

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Authorization check
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const hasPermission = await checkPermission(currentUser.id, MODULES.MESSAGING, ACTIONS.CREATE)
    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden - Insufficient permissions' }, { status: 403 })
    }

    const { From, personalizedRecipients }: BulkSMSRequest = await request.json()

    // Validate input
    if (
      !From ||
      !personalizedRecipients ||
      !Array.isArray(personalizedRecipients) ||
      personalizedRecipients.length === 0
    ) {
      return NextResponse.json(
        { error: 'From and personalizedRecipients are required' },
        { status: 400 }
      )
    }

    // Get Hubtel credentials from environment variables
    const clientId = process.env.HUBTEL_CLIENT_ID
    const clientSecret = process.env.HUBTEL_CLIENT_SECRET

    if (!clientId || !clientSecret) {
      return NextResponse.json({ error: 'Hubtel credentials not configured' }, { status: 500 })
    }

    // Format phone numbers using utility function
    const { formatPhoneNumber } = await import('@/lib/utils/phone')
    const formattedRecipients = personalizedRecipients.map((recipient) => ({
      To: formatPhoneNumber(recipient.To),
      Content: recipient.Content,
    }))

    // Prepare the request body
    const requestBody: BulkSMSRequest = {
      From: From,
      personalizedRecipients: formattedRecipients,
    }

    // Create Basic Auth header
    const authHeader = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')

    // Send bulk SMS via Hubtel API
    const response = await fetch('https://sms.hubtel.com/v1/messages/batch/personalized/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${authHeader}`,
        Accept: 'application/json',
      },
      body: JSON.stringify(requestBody),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Hubtel API error:', errorText)
      return NextResponse.json(
        { error: 'Failed to send bulk SMS', details: errorText },
        { status: response.status }
      )
    }

    const result = await response.json()

    return NextResponse.json({
      success: true,
      message: 'Bulk SMS sent successfully',
      data: result,
    })
  } catch (error) {
    console.error('Bulk SMS sending error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
