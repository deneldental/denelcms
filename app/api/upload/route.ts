import { NextRequest, NextResponse } from 'next/server'
import { uploadFile, generateFileName } from '@/lib/storage'
import { getCurrentUser } from '@/lib/rbac'

export async function POST(request: NextRequest) {
    try {
        // Check authentication
        const currentUser = await getCurrentUser()
        if (!currentUser) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
        }

        const formData = await request.formData()
        const file = formData.get('file') as File
        const folder = formData.get('folder') as
            | 'avatars'
            | 'consent-forms'
            | 'treatments'
            | 'products'
            | 'inventory'
        const name = formData.get('name') as string // Name for the file (e.g., patient name, product name)
        const subfolder = formData.get('subfolder') as string | null // Optional: for treatments patient folder
        const index = formData.get('index') as string | null // Optional: for indexed files

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 })
        }

        if (!folder) {
            return NextResponse.json({ error: 'Folder is required' }, { status: 400 })
        }

        if (!name) {
            return NextResponse.json({ error: 'Name is required' }, { status: 400 })
        }

        // Get file extension
        const fileExtension = file.name.split('.').pop() || ''

        // Generate filename with proper format
        const fileName = await generateFileName(
            name,
            new Date(),
            fileExtension,
            index ? parseInt(index) : undefined
        )

        // Convert file to buffer
        const arrayBuffer = await file.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)

        // Upload to DO Spaces
        const result = await uploadFile({
            folder,
            fileName,
            fileBuffer: buffer,
            contentType: file.type,
            subfolder: subfolder || undefined,
        })

        if (!result.success) {
            return NextResponse.json({ error: result.error }, { status: 500 })
        }

        return NextResponse.json({
            success: true,
            url: result.url,
        })
    } catch (error) {
        console.error('Error uploading file:', error)
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to upload file' },
            { status: 500 }
        )
    }
}
