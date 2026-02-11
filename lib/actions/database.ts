'use server'

import { db } from '@/lib/db'
import {
    patients,
    appointments,
    medicalRecords,
    pendingMedicalRecords,
    payments,
    inventory,
    products,
    treatmentTypes,
    appointmentTypes,
    expenseCategories,
    paymentMethods,
    units,
    categories,
    paymentPlans,
    paymentPlanTemplates,
    expenses,
    doctors,
    doctorUnavailability,
    sales,
    dailyReports,
    smsMessages,
    orthoConsentForms,
    messages,
} from '@/lib/db/schema'
import { getCurrentUser } from '@/lib/rbac'
import { getUserRole } from '@/lib/actions/users'
import { revalidatePath } from 'next/cache'
import { sql } from 'drizzle-orm'

// Map of friendly names to table objects
const TABLE_MAP: Record<string, any> = {
    patients,
    appointments,
    medical_records: medicalRecords,
    pending_medical_records: pendingMedicalRecords,
    payments,
    inventory,
    products,
    treatment_types: treatmentTypes,
    appointment_types: appointmentTypes,
    expense_categories: expenseCategories,
    payment_methods: paymentMethods,
    units,
    categories,
    payment_plans: paymentPlans,
    payment_plan_templates: paymentPlanTemplates,
    expenses,
    doctors,
    doctor_unavailability: doctorUnavailability,
    sales,
    daily_reports: dailyReports,
    sms_messages: smsMessages,
    ortho_consent_forms: orthoConsentForms,
    messages,
}

const TABLE_HEADERS: Record<string, string[]> = {
    patients: ['name', 'email', 'phone', 'dob', 'gender', 'address', 'occupation', 'nationality', 'type', 'isChild', 'isOrtho', 'guardianName', 'guardianPhone', 'guardianEmail', 'guardianAddress', 'guardianOccupation', 'insuranceProvider', 'insurancePolicyNumber', 'emergencyContactName', 'emergencyContactPhone', 'createdAt'],
    appointments: ['patientId', 'doctorId', 'date', 'durationMinutes', 'status', 'type', 'notes'],
    products: ['name', 'description', 'sku', 'category', 'unit', 'price', 'stockQuantity', 'reorderLevel'],
    inventory: ['name', 'description', 'sku', 'category', 'unit', 'stockQuantity', 'reorderLevel'],
    treatment_types: ['name', 'displayName', 'isActive'],
    appointment_types: ['name', 'displayName', 'isActive'],
    payment_methods: ['name', 'displayName', 'isActive'],
    expense_categories: ['name', 'displayName', 'isActive'],
    units: ['name', 'displayName', 'isActive'],
    categories: ['name', 'isActive'],
}

// Helper to check admin permission
async function checkAdmin() {
    const currentUser = await getCurrentUser()
    if (!currentUser) return false
    const roleResult = await getUserRole(currentUser.id)
    return roleResult.success && 'data' in roleResult && roleResult.data === 'admin'
}

export async function getManageableTables() {
    const isAdmin = await checkAdmin()
    if (!isAdmin) return { success: false, error: 'Unauthorized' }

    return {
        success: true,
        data: Object.keys(TABLE_MAP).sort(),
    }
}

export async function clearTable(tableName: string) {
    try {
        const isAdmin = await checkAdmin()
        if (!isAdmin) return { success: false, error: 'Unauthorized' }

        const table = TABLE_MAP[tableName]
        if (!table) return { success: false, error: 'Invalid table name' }

        await db.delete(table)
        revalidatePath('/settings')
        return { success: true }
    } catch (error) {
        console.error('Error clearing table:', error)
        return { success: false, error: 'Failed to clear table' }
    }
}

export async function clearAllBusinessData() {
    try {
        const isAdmin = await checkAdmin()
        if (!isAdmin) return { success: false, error: 'Unauthorized' }

        // Delete in order of dependency to avoid foreign key constraints
        await db.delete(payments)
        await db.delete(sales)
        await db.delete(pendingMedicalRecords)
        await db.delete(medicalRecords)
        await db.delete(orthoConsentForms)
        await db.delete(smsMessages)
        await db.delete(doctorUnavailability)
        await db.delete(appointments)
        await db.delete(paymentPlans)
        await db.delete(patients)
        await db.delete(doctors)
        await db.delete(dailyReports)
        await db.delete(expenses)
        await db.delete(inventory)
        await db.delete(products)
        await db.delete(paymentPlanTemplates)
        await db.delete(messages)
        await db.delete(treatmentTypes)
        await db.delete(appointmentTypes)
        await db.delete(expenseCategories)
        await db.delete(paymentMethods)
        await db.delete(units)
        await db.delete(categories)

        revalidatePath('/settings')
        return { success: true }
    } catch (error) {
        console.error('Error clearing all data:', error)
        return { success: false, error: 'Failed to clear all data' }
    }
}

export async function getTableTemplate(tableName: string) {
    try {
        const isAdmin = await checkAdmin()
        if (!isAdmin) return { success: false, error: 'Unauthorized' }

        const headers = TABLE_HEADERS[tableName]
        if (!headers) {
            // Fallback: try to guess headers from schema (simplified)
            return { success: false, error: 'Template not available for this table' }
        }

        return { success: true, data: headers.join(',') }
    } catch (error) {
        return { success: false, error: 'Failed to generate template' }
    }
}

function parseCSVLine(line: string): string[] {
    const result = []
    let current = ''
    let inQuotes = false

    for (let i = 0; i < line.length; i++) {
        const char = line[i]
        if (char === '"') {
            inQuotes = !inQuotes
        } else if (char === ',' && !inQuotes) {
            result.push(current)
            current = ''
        } else {
            current += char
        }
    }
    result.push(current)
    return result
}

export async function importTableData(tableName: string, csvContent: string) {
    try {
        const isAdmin = await checkAdmin()
        if (!isAdmin) return { success: false, error: 'Unauthorized' }

        const table = TABLE_MAP[tableName]
        if (!table) return { success: false, error: 'Invalid table name' }

        const lines = csvContent.split('\n').filter(line => line.trim())
        if (lines.length < 2) return { success: false, error: 'Empty or invalid CSV' }

        const headers = parseCSVLine(lines[0].trim()).map(h => h.trim())
        const records = []

        for (let i = 1; i < lines.length; i++) {
            const values = parseCSVLine(lines[i].trim())
            if (values.length !== headers.length) continue

            const record: any = {}
            headers.forEach((header, index) => {
                let value: any = values[index]?.trim()

                // Basic type conversion
                if (value === 'true') value = true
                if (value === 'false') value = false
                if (value === 'null' || value === '') value = null
                if (!isNaN(Number(value)) && value !== null && value !== '' && header !== 'phone') {
                    // Check if it looks like a number but shouldn't be (like phone)
                    // For simplicity, we convert to number if it parses, unless specific exceptions
                    value = Number(value)
                }
                // Handle dates
                if (typeof value === 'string' && (header.includes('date') || header === 'dob' || header === 'createdAt')) {
                    const date = new Date(value)
                    if (!isNaN(date.getTime())) value = date
                }

                record[header] = value
            })
            records.push(record)
        }

        if (records.length === 0) return { success: false, error: 'No valid records found' }

        await db.insert(table).values(records)
        revalidatePath('/settings')
        return { success: true, count: records.length }

    } catch (error: any) {
        console.error('Import error:', error)
        return { success: false, error: error.message || 'Import failed' }
    }
}
