import { NextResponse } from 'next/server'
import { generateConsentFormTemplate } from '@/lib/pdf-utils'
import { getCurrentUser } from '@/lib/rbac'

export async function GET() {
  try {
    // Check authentication
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Generate the complete template PDF
    const pdfBuffer = await generateConsentFormTemplate()

    // Return PDF with appropriate headers
    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="ortho-consent-form-template.pdf"',
        'Content-Length': pdfBuffer.length.toString(),
      },
    })
  } catch (error) {
    console.error('Error generating template:', error)
    return NextResponse.json({ error: 'Failed to generate template' }, { status: 500 })
  }
}
