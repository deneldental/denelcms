'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { formatDistanceToNow, format } from 'date-fns'
import {
  Activity,
  User,
  Calendar,
  FileText,
  Eye,
  Edit,
  Trash2,
  Plus,
  Upload,
  Download,
  Lock,
  LockOpen,
  LogIn,
  LogOut,
} from 'lucide-react'

type AuditLog = {
  id: string
  action: string
  module: string
  entityId: string | null
  entityName: string | null
  changes: unknown
  ipAddress: string | null
  userAgent: string | null
  createdAt: Date
  user: {
    id: string
    name: string | null
    email: string | null
  } | null
}

const actionColors: Record<string, string> = {
  create: 'bg-green-500',
  update: 'bg-blue-500',
  delete: 'bg-red-500',
  login: 'bg-purple-500',
  logout: 'bg-gray-500',
  view: 'bg-cyan-500',
  export: 'bg-orange-500',
  upload: 'bg-indigo-500',
  download: 'bg-pink-500',
  lock: 'bg-yellow-500',
  unlock: 'bg-lime-500',
}

const actionIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  create: Plus,
  update: Edit,
  delete: Trash2,
  login: LogIn,
  logout: LogOut,
  view: Eye,
  export: Download,
  upload: Upload,
  download: Download,
  lock: Lock,
  unlock: LockOpen,
}

function getActionIcon(action: string) {
  const Icon = actionIcons[action] || Activity
  return Icon
}

function formatModule(module: string): string {
  return module
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

export function AuditLogsContent({ logs }: { logs: AuditLog[] }) {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Audit Logs</h1>
        <p className="text-muted-foreground">
          Complete history of all system changes and user actions
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            System Activity
          </CardTitle>
          <CardDescription>Showing {logs.length} recent audit log entries</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px] pr-4">
            <div className="space-y-3">
              {logs.map((log) => {
                const Icon = getActionIcon(log.action)
                const actionColor = actionColors[log.action] || 'bg-gray-500'

                return (
                  <Card
                    key={log.id}
                    className="border-l-4 hover:shadow-md transition-shadow"
                    style={{ borderLeftColor: actionColor.replace('bg-', '#') }}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <div className={`${actionColor} p-2 rounded-lg text-white mt-1`}>
                          <Icon className="h-4 w-4" />
                        </div>

                        <div className="flex-1 space-y-2">
                          <div className="flex items-start justify-between gap-4">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <Badge variant="outline" className="capitalize">
                                  {log.action}
                                </Badge>
                                <Badge variant="secondary">{formatModule(log.module)}</Badge>
                                {log.entityName && (
                                  <span className="text-sm font-medium text-muted-foreground">
                                    {log.entityName}
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                <div className="flex items-center gap-1">
                                  <User className="h-3 w-3" />
                                  <span>{log.user?.name || log.user?.email || 'Unknown User'}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  <span title={format(new Date(log.createdAt), 'PPpp')}>
                                    {formatDistanceToNow(new Date(log.createdAt), {
                                      addSuffix: true,
                                    })}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {(() => {
                            const changes = log.changes
                            if (
                              changes &&
                              typeof changes === 'object' &&
                              changes !== null &&
                              Object.keys(changes).length > 0
                            ) {
                              return (
                                <details className="text-xs">
                                  <summary className="cursor-pointer text-muted-foreground hover:text-foreground flex items-center gap-1">
                                    <FileText className="h-3 w-3" />
                                    View changes
                                  </summary>
                                  <div className="mt-2 p-2 bg-muted rounded-md">
                                    <pre className="text-xs overflow-x-auto">
                                      {JSON.stringify(changes, null, 2)}
                                    </pre>
                                  </div>
                                </details>
                              )
                            }
                            return null
                          })()}

                          {(log.ipAddress || log.userAgent) && (
                            <details className="text-xs">
                              <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                                Technical details
                              </summary>
                              <div className="mt-2 space-y-1 text-muted-foreground">
                                {log.ipAddress && <div>IP: {log.ipAddress}</div>}
                                {log.userAgent && (
                                  <div className="truncate" title={log.userAgent}>
                                    User Agent: {log.userAgent}
                                  </div>
                                )}
                              </div>
                            </details>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}

              {logs.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No audit logs found</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}
