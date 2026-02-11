'use client'

import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { getPayments } from '@/lib/actions/payments'
import { getExpenses } from '@/lib/actions/expenses'
import { getPatients } from '@/lib/actions/patients'
import { getAppointments } from '@/lib/actions/appointments'
import { getPaymentMethods } from '@/lib/actions/payment-methods'
import { InventoryMultiSelect } from '@/components/ui/inventory-multiselect'
import { ProductsMultiSelect } from '@/components/ui/products-multiselect'
import { toast } from 'sonner'

type BalanceEntry = {
  id: string
  method: string
  amount: string
}

type PaymentMethod = { id: string; name: string; displayName: string | null }

function getTodayInputValue() {
  const now = new Date()
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 10)
}

function isSameDay(dateValue: Date, dateString: string) {
  const target = new Date(`${dateString}T00:00:00`)
  return (
    dateValue.getFullYear() === target.getFullYear() &&
    dateValue.getMonth() === target.getMonth() &&
    dateValue.getDate() === target.getDate()
  )
}

function formatCurrency(amountCents: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'GHS',
  }).format(amountCents / 100)
}

export function DailyReportForm({
  submittedBy,
  onSubmit,
  isSubmitting = false,
}: {
  submittedBy: string
  onSubmit?: (payload: {
    reportDate: Date
    checkedInCount: number
    newPatientsCount: number
    totalPayments: number
    totalExpenses: number
    balances: Array<{ method: string; amount: number }>
    inventoryUsed: Array<{ id: string; quantity: number }>
    productsSold: Array<{ id: string; quantity: number }>
    additionalNote?: string
  }) => void
  isSubmitting?: boolean
}) {
  const [selectedDate, setSelectedDate] = useState(getTodayInputValue())
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
  interface Patient {
    id: string
    name: string
    createdAt: Date | string
    [key: string]: unknown
  }
  interface Appointment {
    id: string
    date: Date | string
    [key: string]: unknown
  }
  const [payments, setPayments] = useState<Payment[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [patients, setPatients] = useState<Patient[]>([])
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [balances, setBalances] = useState<BalanceEntry[]>([
    { id: 'balance-1', method: '', amount: '' },
  ])
  const [selectedInventory, setSelectedInventory] = useState<
    Array<{ id: string; quantity: number }>
  >([])
  const [selectedProducts, setSelectedProducts] = useState<Array<{ id: string; quantity: number }>>(
    []
  )
  const [additionalNote, setAdditionalNote] = useState('')

  useEffect(() => {
    const loadData = async () => {
      const [paymentsRes, expensesRes, patientsRes, appointmentsRes, paymentMethodsRes] =
        await Promise.all([
          getPayments(),
          getExpenses(),
          getPatients(),
          getAppointments(),
          getPaymentMethods(),
        ])

      if (paymentsRes.success && paymentsRes.data) setPayments(paymentsRes.data)
      if (expensesRes.success && expensesRes.data) setExpenses(expensesRes.data)
      if (patientsRes.success && patientsRes.data) setPatients(patientsRes.data)
      if (appointmentsRes.success && appointmentsRes.data) setAppointments(appointmentsRes.data)
      if (paymentMethodsRes.success && paymentMethodsRes.data)
        setPaymentMethods(paymentMethodsRes.data)

      if (!paymentsRes.success) toast.error(paymentsRes.error || 'Failed to load payments')
      if (!expensesRes.success) toast.error(expensesRes.error || 'Failed to load expenses')
      if (!patientsRes.success) toast.error(patientsRes.error || 'Failed to load patients')
      if (!appointmentsRes.success)
        toast.error(appointmentsRes.error || 'Failed to load appointments')
      if (!paymentMethodsRes.success)
        toast.error(paymentMethodsRes.error || 'Failed to load payment methods')
    }

    loadData()
  }, [])

  const dailyPayments = useMemo(() => {
    return payments.filter((payment) => {
      const createdAt = new Date(payment.createdAt)
      return isSameDay(createdAt, selectedDate)
    })
  }, [payments, selectedDate])

  const dailyExpenses = useMemo(() => {
    return expenses.filter((expense) => {
      const expenseDate = new Date(expense.date || expense.createdAt || new Date())
      return isSameDay(expenseDate, selectedDate)
    })
  }, [expenses, selectedDate])

  const dailyNewPatients = useMemo(() => {
    return patients.filter((patient) => {
      const createdAt = new Date(patient.createdAt)
      return isSameDay(createdAt, selectedDate)
    })
  }, [patients, selectedDate])

  const dailyCheckedInPatients = useMemo(() => {
    return appointments.filter((appointment) => {
      if (appointment.status !== 'completed') return false
      const appointmentDate = new Date(appointment.date)
      return isSameDay(appointmentDate, selectedDate)
    })
  }, [appointments, selectedDate])

  const totalPayments = dailyPayments.reduce((sum, p) => sum + (p.amount || 0), 0)
  const totalExpenses = dailyExpenses.reduce((sum, e) => sum + (e.amount || 0), 0)
  const totalBalance = totalPayments - totalExpenses
  const isOverspent = totalExpenses > totalPayments

  const addBalanceRow = () => {
    setBalances((prev) => [...prev, { id: `balance-${prev.length + 1}`, method: '', amount: '' }])
  }

  const removeBalanceRow = (id: string) => {
    setBalances((prev) => prev.filter((row) => row.id !== id))
  }

  const handleSubmit = () => {
    if (!onSubmit) return

    // Validate additional note when overspent
    if (isOverspent) {
      if (!additionalNote.trim()) {
        toast.error('Please provide an additional note about who we owe.')
        return
      }

      // Submit without balance validation when overspent
      onSubmit({
        reportDate: new Date(`${selectedDate}T00:00:00`),
        checkedInCount: dailyCheckedInPatients.length,
        newPatientsCount: dailyNewPatients.length,
        totalPayments,
        totalExpenses,
        balances: [], // No balances when overspent
        inventoryUsed: selectedInventory,
        productsSold: selectedProducts,
        additionalNote: additionalNote,
      })
      return
    }

    // When not overspent, validate balances
    const cleanedBalances = balances
      .filter((row) => row.method && row.amount)
      .map((row) => ({
        method: row.method,
        amount: Math.round(Number(row.amount) * 100),
      }))

    if (cleanedBalances.length === 0) {
      toast.error('Please add at least one balance entry.')
      return
    }

    if (cleanedBalances.some((row) => Number.isNaN(row.amount))) {
      toast.error('Balance amounts must be valid numbers.')
      return
    }

    // Validate that total balances equal the calculated total balance
    const balancesSum = cleanedBalances.reduce((sum, b) => sum + b.amount, 0)
    const expectedBalance = totalBalance

    if (Math.abs(balancesSum - expectedBalance) > 1) {
      // Allow 1 cent tolerance for rounding
      toast.error(
        `Balance amounts must add up to ${formatCurrency(expectedBalance)}. Current sum: ${formatCurrency(balancesSum)}`
      )
      return
    }

    onSubmit({
      reportDate: new Date(`${selectedDate}T00:00:00`),
      checkedInCount: dailyCheckedInPatients.length,
      newPatientsCount: dailyNewPatients.length,
      totalPayments,
      totalExpenses,
      balances: cleanedBalances,
      inventoryUsed: selectedInventory,
      productsSold: selectedProducts,
      additionalNote: undefined,
    })
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Date - Report</h1>
        <div className="flex items-center gap-3">
          <Label htmlFor="report-date" className="text-sm text-muted-foreground">
            Date
          </Label>
          <Input
            id="report-date"
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="max-w-[220px]"
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Total checked-in patients</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {dailyCheckedInPatients.length}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Total new patients</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{dailyNewPatients.length}</CardContent>
        </Card>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Total payment received</h2>
          <span className="text-sm font-semibold text-green-600">
            {formatCurrency(totalPayments)}
          </span>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {dailyPayments.map((payment) => (
            <Card key={payment.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">
                  {payment.patient?.name || 'Walk-in'}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                <div className="flex items-center justify-between">
                  <span>{payment.method?.replace('_', ' ') || 'Payment'}</span>
                  <span className="font-semibold text-foreground">
                    {formatCurrency(payment.amount)}
                  </span>
                </div>
                <div className="mt-1 text-xs">
                  {new Date(payment.createdAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
          {dailyPayments.length === 0 && (
            <Card>
              <CardContent className="text-sm text-muted-foreground py-6">
                No payments recorded for this date.
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Total expenses made</h2>
          <span className="text-sm font-semibold text-red-600">
            {formatCurrency(totalExpenses)}
          </span>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {dailyExpenses.map((expense) => (
            <Card key={expense.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold capitalize">
                  {expense.category}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                <div className="flex items-center justify-between">
                  <span>{expense.paymentMethod || 'Expense'}</span>
                  <span className="font-semibold text-foreground">
                    {formatCurrency(expense.amount)}
                  </span>
                </div>
                {expense.description && <div className="mt-1 text-xs">{expense.description}</div>}
              </CardContent>
            </Card>
          ))}
          {dailyExpenses.length === 0 && (
            <Card>
              <CardContent className="text-sm text-muted-foreground py-6">
                No expenses recorded for this date.
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="text-xl font-semibold">Inventory Used</h2>
        <div className="space-y-2">
          <Label>Select inventory items used</Label>
          <InventoryMultiSelect
            value={selectedInventory}
            onChange={setSelectedInventory}
            placeholder="Select inventory items..."
          />
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="text-xl font-semibold">Products Sold</h2>
        <div className="space-y-2">
          <Label>Select products sold</Label>
          <ProductsMultiSelect
            value={selectedProducts}
            onChange={setSelectedProducts}
            placeholder="Select products..."
          />
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">
            {isOverspent ? 'Outstanding Amount (Deficit)' : 'Balance'}
          </h2>
          <span className={`text-lg font-bold ${isOverspent ? 'text-red-600' : 'text-green-600'}`}>
            {formatCurrency(Math.abs(totalBalance))}
            {isOverspent && ' (DEFICIT)'}
          </span>
        </div>

        {isOverspent ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4">
            <p className="text-sm font-medium text-red-800 mb-2">
              ⚠️ Expenses exceed payments by {formatCurrency(Math.abs(totalBalance))}
            </p>
            <p className="text-xs text-red-600 mb-3">
              Since expenses are higher than payments, please provide details about the outstanding
              amount.
            </p>
            <div className="space-y-2">
              <Label htmlFor="additionalNote" className="text-red-800">
                Additional Note <span className="text-red-600">*</span>
              </Label>
              <Input
                id="additionalNote"
                placeholder="Who do we owe?"
                value={additionalNote}
                onChange={(e) => setAdditionalNote(e.target.value)}
                className="border-red-300 focus:border-red-500"
                required={isOverspent}
              />
            </div>
          </div>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              Note: Individual balances must add up to {formatCurrency(totalBalance)}
            </p>
            <div className="space-y-3">
              {balances.map((row) => (
                <div key={row.id} className="grid gap-3 md:grid-cols-[1fr_1fr_auto] items-end">
                  <div className="space-y-2">
                    <Label>Payment Method</Label>
                    <Select
                      value={row.method}
                      onValueChange={(value) =>
                        setBalances((prev) =>
                          prev.map((entry) =>
                            entry.id === row.id ? { ...entry, method: value } : entry
                          )
                        )
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select method" />
                      </SelectTrigger>
                      <SelectContent>
                        {paymentMethods.map((method) => (
                          <SelectItem key={method.id} value={method.name}>
                            {method.displayName || method.name.replace('_', ' ')}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Balance left (GHS)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={row.amount}
                      onChange={(e) =>
                        setBalances((prev) =>
                          prev.map((entry) =>
                            entry.id === row.id ? { ...entry, amount: e.target.value } : entry
                          )
                        )
                      }
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    {balances.length > 1 && (
                      <Button variant="outline" onClick={() => removeBalanceRow(row.id)}>
                        Remove
                      </Button>
                    )}
                  </div>
                </div>
              ))}
              <Button variant="outline" onClick={addBalanceRow}>
                Add Payment Method
              </Button>
            </div>
          </>
        )}
      </div>

      <div className="text-sm text-muted-foreground">
        Submitted by: <span className="font-medium text-foreground">{submittedBy}</span>
      </div>

      {onSubmit && (
        <div className="flex items-center justify-end">
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Submitting...' : 'Submit Report'}
          </Button>
        </div>
      )}
    </div>
  )
}
