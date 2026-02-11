/**
 * Currency formatting utilities for the mini-clinic application.
 * All monetary values are stored in the database as integers representing cents.
 * All user-facing displays show amounts in GHS (Ghana Cedis) with proper formatting.
 */

/**
 * Formats an amount in cents to GHS currency string with symbol.
 * @param amountInCents - The amount in cents (integer from database)
 * @returns Formatted string like "GHS 9,000.00"
 * @example formatCurrency(900000) // Returns "GHS 9,000.00"
 */
export function formatCurrency(amountInCents: number): string {
    const amountInGHS = amountInCents / 100
    return new Intl.NumberFormat('en-GH', {
        style: 'currency',
        currency: 'GHS',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(amountInGHS)
}

/**
 * Formats an amount in cents to GHS string without currency symbol.
 * Useful for receipts and tables where the currency is implied.
 * @param amountInCents - The amount in cents (integer from database)
 * @returns Formatted string like "9,000.00"
 * @example formatAmount(900000) // Returns "9,000.00"
 */
export function formatAmount(amountInCents: number): string {
    const amountInGHS = amountInCents / 100
    return new Intl.NumberFormat('en-GH', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(amountInGHS)
}

/**
 * Converts cents to GHS decimal value.
 * @param amountInCents - The amount in cents (integer from database)
 * @returns The amount in GHS as a decimal number
 * @example centsToGHS(900000) // Returns 9000.00
 */
export function centsToGHS(amountInCents: number): number {
    return amountInCents / 100
}

/**
 * Converts GHS to cents for database storage.
 * @param amountInGHS - The amount in GHS as a decimal
 * @returns The amount in cents as an integer
 * @example ghsToCents(9000.00) // Returns 900000
 */
export function ghsToCents(amountInGHS: number): number {
    return Math.round(amountInGHS * 100)
}
