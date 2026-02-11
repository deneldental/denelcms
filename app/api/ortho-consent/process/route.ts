import { NextRequest, NextResponse } from 'next/server'
import { processUploadedConsentForm, validateConsentFormUpload } from '@/lib/pdf-utils'
import { getCurrentUser } from '@/lib/rbac'
import { uploadFile, generateFileName } from '@/lib/storage'

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Get the uploaded file from form data
    const formData = await request.formData()
    const file = formData.get('file') as File
    const patientName = formData.get('patientName') as string

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (!patientName) {
      return NextResponse.json({ error: 'Patient name is required' }, { status: 400 })
    }

    // Validate file type
    if (file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'Only PDF files are allowed' }, { status: 400 })
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'File size must be less than 10MB' }, { status: 400 })
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Validate that PDF has exactly 2 pages
    const validation = await validateConsentFormUpload(buffer)
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }

    // Process the uploaded PDF (split and recombine with templates)
    const processedPdfBuffer = await processUploadedConsentForm(buffer)

    // Generate filename with proper format: [fullname]_[ddMMMyyyy].pdf
    const fileName = await generateFileName(patientName, new Date(), 'pdf')

    // Upload to Digital Ocean Spaces
    const result = await uploadFile({
      folder: 'consent-forms',
      fileName,
      fileBuffer: processedPdfBuffer,
      contentType: 'application/pdf',
    })

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      url: result.url,
    })
  } catch (error) {
    console.error('Error processing consent form:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process consent form' },
      { status: 500 }
    )
  }
}
