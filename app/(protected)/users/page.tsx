export const runtime = 'edge';

import { getUsers } from '@/lib/actions/users'
import { UserList } from '@/components/users/user-list'
import { AddUserDialog } from '@/components/users/add-user-dialog'

export default async function UsersPage() {
  const result = await getUsers()
  const users = result.success ? result.data : []

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Users</h1>
          <div className="text-muted-foreground">
            Manage system users (Admins, Doctors, Receptionists).
          </div>
        </div>
        <AddUserDialog />
      </div>

      <UserList data={users || []} />
    </div>
  )
}
