import { getOrthoConsentForms } from '@/lib/actions/ortho-consent'
import { OrthoConsentContent } from './ortho-consent-content'
import { getCurrentUser } from '@/lib/rbac'
import { ROLES } from '@/lib/modules'
import { db } from '@/lib/db'
import { user } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export default async function OrthoConsentPage() {
  const result = await getOrthoConsentForms()

  // Get current user role
  const currentUser = await getCurrentUser()
  const dbUser = currentUser
    ? await db.query.user.findFirst({
        where: eq(user.id, currentUser.id),
        with: {
          role: {
            columns: {
              id: true,
            },
          },
        },
      })
    : null

  const userRole = dbUser?.role?.id
  const isDoctor = userRole === ROLES.DOCTOR

  const consentForms = result.success ? result.data : []

  return <OrthoConsentContent consentForms={consentForms || []} canEdit={!isDoctor} />
}
