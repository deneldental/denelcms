'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Calendar } from 'lucide-react'
import { format } from 'date-fns'
import { getDailySales } from '@/lib/actions/sales'
import { sales, products } from '@/lib/db/schema'

type Sale = typeof sales.$inferSelect
type Product = typeof products.$inferSelect

interface SalesItem {
  sale: Sale
  product: Product | null
}
import { toast } from 'sonner'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export function SalesView() {
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'))
  const [salesData, setSalesData] = useState<SalesItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [summary, setSummary] = useState({
    totalSales: 0,
    totalProfit: 0,
    totalLoss: 0,
    totalItems: 0,
  })

  const loadSales = async (date?: string) => {
    setIsLoading(true)
    try {
      const dateToUse = date ? new Date(date) : new Date()
      const result = await getDailySales(dateToUse)

      if (result.success && result.data) {
        setSalesData(result.data)

        // Calculate summary
        const totals = result.data.reduce(
          (acc, item: SalesItem) => {
            acc.totalSales += item.sale.totalAmount
            acc.totalProfit += item.sale.profit > 0 ? item.sale.profit : 0
            acc.totalLoss += item.sale.profit < 0 ? Math.abs(item.sale.profit) : 0
            acc.totalItems += item.sale.quantity
            return acc
          },
          { totalSales: 0, totalProfit: 0, totalLoss: 0, totalItems: 0 }
        )

        setSummary(totals)
      } else {
        toast.error(result.error || 'Failed to load sales')
        setSalesData([])
        setSummary({ totalSales: 0, totalProfit: 0, totalLoss: 0, totalItems: 0 })
      }
    } catch {
      toast.error('Failed to load sales')
      setSalesData([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadSales(selectedDate)
  }, [selectedDate])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'GHS',
    }).format(amount / 100)
  }

  return (
    <div className="space-y-6">
      {/* Date Selector */}
      <Card>
        <CardHeader>
          <CardTitle>Select Date</CardTitle>
          <CardDescription>View sales for a specific date</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="space-y-2">
              <Label htmlFor="sale-date">Date</Label>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <Input
                  id="sale-date"
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-[200px]"
                />
              </div>
            </div>
            <Button onClick={() => loadSales(selectedDate)} disabled={isLoading}>
              Load Sales
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Sales</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summary.totalSales)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Profit</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(summary.totalProfit)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Loss</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(summary.totalLoss)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Items Sold</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalItems}</div>
          </CardContent>
        </Card>
      </div>

      {/* Sales Table */}
      <Card>
        <CardHeader>
          <CardTitle>Sales Details</CardTitle>
          <CardDescription>
            Sales for {format(new Date(selectedDate), 'MMMM d, yyyy')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading sales...</div>
          ) : salesData.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No sales found for this date
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Unit Price</TableHead>
                  <TableHead>Cost Price</TableHead>
                  <TableHead>Total Amount</TableHead>
                  <TableHead>Profit/Loss</TableHead>
                  <TableHead>Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {salesData.map((item) => {
                  const isProfit = item.sale.profit >= 0
                  return (
                    <TableRow key={item.sale.id}>
                      <TableCell className="font-medium">
                        {item.product?.name || 'Unknown Product'}
                      </TableCell>
                      <TableCell>{item.sale.quantity}</TableCell>
                      <TableCell>{formatCurrency(item.sale.unitPrice)}</TableCell>
                      <TableCell>{formatCurrency(item.sale.costPrice)}</TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(item.sale.totalAmount)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={isProfit ? 'default' : 'destructive'}>
                          {isProfit ? '+' : ''}
                          {formatCurrency(item.sale.profit)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(item.sale.saleDate), 'h:mm a')}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
