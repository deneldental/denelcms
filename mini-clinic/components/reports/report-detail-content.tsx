'use client'

import Link from 'next/link'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft } from 'lucide-react'
import { format } from 'date-fns'
import { useRouter } from 'next/navigation'
import { DailyReport } from '@/app/(protected)/reports/columns'
import { useState, useEffect } from 'react'
import { getInventoryItems } from '@/lib/actions/inventory'
import { getProducts } from '@/lib/actions/products'
import { getPayments } from '@/lib/actions/payments'
import { getExpenses } from '@/lib/actions/expenses'
import { inventory, products } from '@/lib/db/schema'

type InventoryItem = typeof inventory.$inferSelect
type Product = typeof products.$inferSelect

interface ReportDetailContentProps {
  report: DailyReport
}

function isSameDay(dateValue: Date, dateString: string) {
  const target = new Date(`${dateString}T00:00:00`)
  return (
    dateValue.getFullYear() === target.getFullYear() &&
    dateValue.getMonth() === target.getMonth() &&
    dateValue.getDate() === target.getDate()
  )
}

export function ReportDetailContent({ report }: ReportDetailContentProps) {
  const router = useRouter()
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([])
  const [productsList, setProductsList] = useState<Product[]>([])
  interface Payment {
    id: string
    amount: number
    createdAt: Date | string
    method?: string | null
    patient?: {
      name: string
    } | null
    [key: string]: unknown
  }
  interface Expense {
    id: string
    amount: number
    date?: Date | string
    createdAt?: Date | string
    category?: string
    paymentMethod?: string | null
    description?: string | null
    [key: string]: unknown
  }
  const [payments, setPayments] = useState<Payment[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const reportDate = new Date(report.reportDate)
  const reportDateString = reportDate.toISOString().slice(0, 10)

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      const [inventoryResult, productsResult, paymentsResult, expensesResult] = await Promise.all([
        getInventoryItems(),
        getProducts(),
        getPayments(),
        getExpenses(),
      ])
      if (inventoryResult.success && inventoryResult.data) {
        setInventoryItems(inventoryResult.data)
      }
      if (productsResult.success && productsResult.data) {
        setProductsList(productsResult.data)
      }
      if (paymentsResult.success && paymentsResult.data) {
        setPayments(paymentsResult.data)
      }
      if (expensesResult.success && expensesResult.data) {
        setExpenses(expensesResult.data)
      }
      setIsLoading(false)
    }
    loadData()
  }, [])

  // Filter payments and expenses for the report date
  const dailyPayments = payments.filter((payment) => {
    const createdAt = new Date(payment.createdAt)
    return isSameDay(createdAt, reportDateString)
  })

  const dailyExpenses = expenses.filter((expense) => {
    const expenseDate = new Date(expense.date || expense.createdAt || new Date())
    return isSameDay(expenseDate, reportDateString)
  })

  const formatCurrency = (amountCents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'GHS',
    }).format(amountCents / 100)
  }

  const createdAt = new Date(report.createdAt)

  // Get inventory item names
  const getInventoryName = (id: string) => {
    const item = inventoryItems.find((i) => i.id === id)
    return item?.name || 'Unknown Item'
  }

  // Get product names
  const getProductName = (id: string) => {
    const product = productsList.find((p) => p.id === id)
    return product?.name || 'Unknown Product'
  }

  const inventoryUsed = (report.inventoryUsed as Array<{ id: string; quantity: number }>) || []
  const productsSold = (report.productsSold as Array<{ id: string; quantity: number }>) || []
  const balances = (report.balances as Array<{ method: string; amount: number }>) || []

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Breadcrumbs */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/reports">Reports</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{format(reportDate, 'MMM d, yyyy')}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </div>
      </div>

      {/* Report Details */}
      <div className="grid gap-6">
        {/* Summary Card */}
        <Card>
          <CardHeader>
            <CardTitle>Report Summary</CardTitle>
            <CardDescription>
              Daily report for {format(reportDate, 'EEEE, MMMM d, yyyy')}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Checked-in Patients</p>
              <p className="text-2xl font-bold">{report.checkedInCount}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">New Patients</p>
              <p className="text-2xl font-bold">{report.newPatientsCount}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Payments</p>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(report.totalPayments)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Expenses</p>
              <p className="text-2xl font-bold text-red-600">
                {formatCurrency(report.totalExpenses)}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Payments Breakdown */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Total Payment Received</CardTitle>
                <CardDescription>Breakdown of all payments for this date</CardDescription>
              </div>
              <span className="text-lg font-semibold text-green-600">
                {formatCurrency(report.totalPayments)}
              </span>
            </div>
          </CardHeader>
          <CardContent>
            {dailyPayments.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">
                No payments recorded for this date.
              </p>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {dailyPayments.map((payment) => (
                  <Card key={payment.id} className="border">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-semibold">
                        {payment.patient?.name || 'Walk-in'}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground">
                      <div className="flex items-center justify-between">
                        <span className="capitalize">
                          {payment.method?.replace('_', ' ') || 'Payment'}
                        </span>
                        <span className="font-semibold text-foreground">
                          {formatCurrency(payment.amount)}
                        </span>
                      </div>
                      <div className="mt-1 text-xs">
                        {format(new Date(payment.createdAt), 'h:mm a')}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Expenses Breakdown */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Total Expenses Made</CardTitle>
                <CardDescription>Breakdown of all expenses for this date</CardDescription>
              </div>
              <span className="text-lg font-semibold text-red-600">
                {formatCurrency(report.totalExpenses)}
              </span>
            </div>
          </CardHeader>
          <CardContent>
            {dailyExpenses.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">
                No expenses recorded for this date.
              </p>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {dailyExpenses.map((expense) => (
                  <Card key={expense.id} className="border">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-semibold capitalize">
                        {expense.category}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground">
                      <div className="flex items-center justify-between">
                        <span className="capitalize">{expense.paymentMethod || 'Expense'}</span>
                        <span className="font-semibold text-foreground">
                          {formatCurrency(expense.amount)}
                        </span>
                      </div>
                      {expense.description && (
                        <div className="mt-1 text-xs">{expense.description}</div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Balances Card */}
        {balances.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Balances</CardTitle>
              <CardDescription>Payment method balances</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {balances.map((balance, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <span className="font-medium capitalize">{balance.method}</span>
                    <span className="text-lg font-semibold">{formatCurrency(balance.amount)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Inventory Used Card */}
        {inventoryUsed.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Inventory Used</CardTitle>
              <CardDescription>Items used during this period</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <p className="text-sm text-muted-foreground">Loading inventory items...</p>
              ) : (
                <div className="space-y-2">
                  {inventoryUsed.map((item, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <span className="font-medium">{getInventoryName(item.id)}</span>
                      <Badge variant="secondary">Qty: {item.quantity}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Products Sold Card */}
        {productsSold.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Products Sold</CardTitle>
              <CardDescription>Products sold during this period</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <p className="text-sm text-muted-foreground">Loading products...</p>
              ) : (
                <div className="space-y-2">
                  {productsSold.map((product, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <span className="font-medium">{getProductName(product.id)}</span>
                      <Badge variant="secondary">Qty: {product.quantity}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Metadata Card */}
        <Card>
          <CardHeader>
            <CardTitle>Report Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Submitted By:</span>
              <span className="font-medium">
                {report.submittedBy?.name || report.submittedBy?.email || 'Unknown'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Created At:</span>
              <span className="font-medium">{format(createdAt, "MMM d, yyyy 'at' h:mm a")}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
