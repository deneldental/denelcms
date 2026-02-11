'use server'

import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'

// Initialize S3 Client for Digital Ocean Spaces
const s3Client = new S3Client({
    endpoint: process.env.DO_SPACES_ENDPOINT!,
    region: process.env.DO_SPACES_REGION!,
    credentials: {
        accessKeyId: process.env.DO_SPACES_KEY!,
        secretAccessKey: process.env.DO_SPACES_SECRET!,
    },
})

const BUCKET_NAME = process.env.DO_SPACES_BUCKET!

/**
 * Format date as ddMMMyyyy (e.g., 15mar2025)
 */
function formatDate(date: Date): string {
    const day = String(date.getDate()).padStart(2, '0')
    const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']
    const month = months[date.getMonth()]
    const year = date.getFullYear()
    return `${day}${month}${year}`
}

/**
 * Sanitize name for use in filenames (remove special characters, replace spaces with underscores)
 */
function sanitizeName(name: string): string {
    return name
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, '_')
        .trim()
}

/**
 * Generate filename with format: [name]_[ddMMMyyyy].[ext]
 * For indexed files: [name]_[ddMMMyyyy]_[index].[ext]
 */
export async function generateFileName(
    name: string,
    date: Date,
    extension: string,
    index?: number
): Promise<string> {
    const sanitized = sanitizeName(name)
    const formattedDate = formatDate(date)
    const ext = extension.startsWith('.') ? extension : `.${extension}`

    if (index !== undefined) {
        const indexStr = String(index).padStart(3, '0')
        return `${sanitized}_${formattedDate}_${indexStr}${ext}`
    }

    return `${sanitized}_${formattedDate}${ext}`
}

/**
 * Upload a file to Digital Ocean Spaces
 */
export async function uploadFile(params: {
    folder: 'avatars' | 'consent-forms' | 'treatments' | 'products' | 'inventory'
    fileName: string
    fileBuffer: Buffer
    contentType: string
    subfolder?: string // For treatments: patient folder
}): Promise<{ success: boolean; url?: string; error?: string }> {
    try {
        // Construct the key (path in bucket)
        let key = `${params.folder}/`
        if (params.subfolder) {
            key += `${params.subfolder}/`
        }
        key += params.fileName

        const command = new PutObjectCommand({
            Bucket: BUCKET_NAME,
            Key: key,
            Body: params.fileBuffer,
            ContentType: params.contentType,
            ACL: 'public-read', // Make files publicly accessible
        })

        await s3Client.send(command)

        // Construct public URL with bucket name
        // Format: https://{bucket}.{region}.cdn.digitaloceanspaces.com/{key}
        const region = process.env.DO_SPACES_REGION!.toLowerCase()
        const url = `https://${BUCKET_NAME}.${region}.cdn.digitaloceanspaces.com/${key}`

        return { success: true, url }
    } catch (error) {
        console.error('Error uploading file to DO Spaces:', error)
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to upload file',
        }
    }
}

/**
 * Delete a file from Digital Ocean Spaces
 */
export async function deleteFile(
    fileUrl: string
): Promise<{ success: boolean; error?: string }> {
    try {
        // Extract key from URL
        const endpoint = process.env.DO_SPACES_ENDPOINT!
        const key = fileUrl.replace(`${endpoint}/`, '')

        const command = new DeleteObjectCommand({
            Bucket: BUCKET_NAME,
            Key: key,
        })

        await s3Client.send(command)

        return { success: true }
    } catch (error) {
        console.error('Error deleting file from DO Spaces:', error)
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to delete file',
        }
    }
}

/**
 * Get public URL for a file
 */
export async function getPublicUrl(key: string): Promise<string> {
    const region = process.env.DO_SPACES_REGION!.toLowerCase()
    return `https://${BUCKET_NAME}.${region}.cdn.digitaloceanspaces.com/${key}`
}
