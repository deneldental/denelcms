import { getOrthoConsentForms } from '@/lib/actions/ortho-consent'
import { ConsentFormViewer } from './consent-form-viewer'
import { redirect } from 'next/navigation'

export default async function ConsentFormPage({
  params,
}: {
  params: Promise<{ patientId: string }>
}) {
  // Await params as it's now a Promise in Next.js 15+
  const { patientId } = await params

  const result = await getOrthoConsentForms()

  if (!result.success) {
    redirect('/ortho-consent')
  }

  const allForms = result.data || []
  const consentForm = allForms.find((form) => form.id === patientId)

  if (!consentForm) {
    redirect('/ortho-consent')
  }

  return <ConsentFormViewer consentForm={consentForm} />
}
