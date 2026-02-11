'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Users,
  TrendingDown,
  TrendingUp,
  Calendar,
  CalendarCheck,
  AlertTriangle,
  Cake,
  Clock,
} from 'lucide-react'
import Link from 'next/link'
import { format, formatDistanceToNow } from 'date-fns'
import { OverduePaymentsCard } from '@/components/dashboard/overdue-payments-card'
import { formatCurrency } from '@/lib/utils/currency'

interface ReceptionistDashboardContentProps {
  stats: {
    totalPatients: number
    todayExpenses: number
    todayPayments: number
    todayCheckedIn: number
    todayBooked: number
  }
  upcomingAppointments: Array<{
    id: string
    date: Date | string
    status: string
    type: string
    patient: {
      id: string
      name: string
      phone: string | null
      profileImage: string | null
    }
    doctor: {
      id: string
      user: {
        name: string
      }
    }
    [key: string]: unknown
  }>
  lowStockItems: Array<{
    id: string
    name: string
    stockQuantity: number
    type?: string | null
    unit?: string | null
    [key: string]: unknown
  }>
  birthdaysAndFollowups: {
    birthdays: Array<{
      id: string
      name: string
      phone: string | null
      profileImage: string | null
      dob: Date
      type: 'birthday'
      date: Date
      isToday: boolean
      isTomorrow: boolean
    }>
    followups: Array<{
      id: string
      name: string
      phone: string | null
      profileImage: string | null
      type: 'followup'
      date: Date
      appointmentId: string
    }>
  }
  overduePayments: Array<{
    id: string
    patient: {
      id: string
      name: string
      phone: string | null
      guardianPhone: string | null
      isChild: boolean
    }
    totalAmount: number
    amountPerInstallment: number | null
    paymentFrequency: string | null
    startDate: Date
    payments: Array<{
      amount: number
      status: string
    }>
  }>
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function ReceptionistDashboardContent({
  stats,
  upcomingAppointments,
  lowStockItems,
  birthdaysAndFollowups,
  overduePayments,
}: ReceptionistDashboardContentProps) {
  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Total Patients */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Patients</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalPatients}</div>
            <p className="text-xs text-muted-foreground">All registered patients</p>
          </CardContent>
        </Card>

        {/* Today's Expenses */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today&apos;s Expenses</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.todayExpenses)}</div>
            <p className="text-xs text-muted-foreground">Total expenses today</p>
          </CardContent>
        </Card>

        {/* Today's Payments */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today&apos;s Payments</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.todayPayments)}</div>
            <p className="text-xs text-muted-foreground">Total revenue today</p>
          </CardContent>
        </Card>

        {/* Today's Appointments */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today&apos;s Appointments</CardTitle>
            <CalendarCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.todayCheckedIn} / {stats.todayBooked}
            </div>
            <p className="text-xs text-muted-foreground">Checked-in / Booked today</p>
          </CardContent>
        </Card>
      </div>

      {/* Overdue Payments Card */}
      {overduePayments.length > 0 && (
        <OverduePaymentsCard overduePayments={overduePayments} />
      )}

      {/* Content Sections */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Upcoming Appointments - Full Width */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Upcoming Appointments
            </CardTitle>
            <CardDescription>Next 10 scheduled appointments</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px] pr-4">
              {upcomingAppointments.length > 0 ? (
                <div className="space-y-4">
                  {upcomingAppointments.map((appointment) => (
                    <div
                      key={appointment.id}
                      className="flex items-start gap-3 pb-3 border-b last:border-0"
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={appointment.patient?.profileImage || undefined} />
                        <AvatarFallback>
                          {getInitials(appointment.patient?.name || 'U')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 space-y-1">
                        <Link
                          href={`/patients/${appointment.patient.id}`}
                          className="font-medium hover:underline"
                        >
                          {appointment.patient.name}
                        </Link>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(appointment.date), 'MMM dd, yyyy HH:mm')}
                        </p>
                        <Badge
                          variant={appointment.status === 'completed' ? 'default' : 'secondary'}
                        >
                          {appointment.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No upcoming appointments
                </p>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Low Stock Alert */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Low Stock Alert
            </CardTitle>
            <CardDescription>Items running low on stock</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px] pr-4">
              {lowStockItems.length > 0 ? (
                <div className="space-y-3">
                  {lowStockItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between pb-3 border-b last:border-0"
                    >
                      <div>
                        <p className="font-medium">{item.name}</p>
                        <p className="text-xs text-muted-foreground capitalize">{item.type}</p>
                      </div>
                      <Badge variant="destructive">
                        {item.stockQuantity} {item.unit || 'units'}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">
                  All items sufficiently stocked
                </p>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Birthdays & Follow-ups */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Cake className="h-5 w-5" />
              Birthdays & Follow-ups
            </CardTitle>
            <CardDescription>Upcoming patient reminders</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px] pr-4">
              <div className="space-y-4">
                {birthdaysAndFollowups.birthdays.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-sm mb-2">Upcoming Birthdays</h4>
                    <div className="space-y-2">
                      {birthdaysAndFollowups.birthdays.map((patient) => (
                        <div key={patient.id} className="flex items-center gap-3 pb-2 border-b">
                          <Cake className="h-4 w-4 text-pink-500" />
                          <div className="flex-1">
                            <Link
                              href={`/patients/${patient.id}`}
                              className="text-sm font-medium hover:underline"
                            >
                              {patient.name}
                            </Link>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(patient.date), 'MMM dd')}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {birthdaysAndFollowups.followups.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-sm mb-2">Pending Follow-ups</h4>
                    <div className="space-y-2">
                      {birthdaysAndFollowups.followups.map((appointment) => (
                        <div key={appointment.id} className="flex items-center gap-3 pb-2 border-b">
                          <Clock className="h-4 w-4 text-blue-500" />
                          <div className="flex-1">
                            <Link
                              href={`/patients/${appointment.id}`}
                              className="text-sm font-medium hover:underline"
                            >
                              {appointment.name}
                            </Link>
                            <p className="text-xs text-muted-foreground">
                              Last visit:{' '}
                              {formatDistanceToNow(new Date(appointment.date), { addSuffix: true })}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {birthdaysAndFollowups.birthdays.length === 0 &&
                  birthdaysAndFollowups.followups.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No pending reminders
                    </p>
                  )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
