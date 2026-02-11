'use server'

import { db } from '@/lib/db'
import { messages } from '@/lib/db/schema'
import { eq, or } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { checkPermission, getCurrentUser } from '@/lib/rbac'
import { MODULES, ACTIONS } from '@/lib/modules'

const MODULE = MODULES.MESSAGING

// Get messages for current user
export async function getMessages() {
  const currentUser = await getCurrentUser()
  if (!currentUser) return { error: 'Not authenticated' }

  if (!(await checkPermission(currentUser.id, MODULE, ACTIONS.READ)))
    return { error: 'Unauthorized' }

  try {
    const data = await db.query.messages.findMany({
      where: or(eq(messages.senderId, currentUser.id), eq(messages.receiverId, currentUser.id)),
      with: { sender: true, receiver: true },
      orderBy: (messages, { desc }) => [desc(messages.createdAt)],
    })
    return { success: true, data }
  } catch {
    return { error: 'Failed to fetch messages' }
  }
}

export async function sendMessage(receiverId: string, content: string) {
  const currentUser = await getCurrentUser()
  if (!currentUser) return { error: 'Not authenticated' }

  if (!(await checkPermission(currentUser.id, MODULE, ACTIONS.CREATE)))
    return { error: 'Unauthorized' }

  try {
    await db.insert(messages).values({
      senderId: currentUser.id,
      receiverId,
      content,
    })
    revalidatePath('/messaging')
    return { success: true }
  } catch {
    return { error: 'Failed to send message' }
  }
}

// Mark as read, etc.
