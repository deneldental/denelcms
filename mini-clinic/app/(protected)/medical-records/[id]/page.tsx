import { getMedicalRecord } from '@/lib/actions/medical-records'
import { notFound } from 'next/navigation'
import { MedicalRecordDetailContent } from '@/components/medical-records/medical-record-detail-content'

export default async function MedicalRecordDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const result = await getMedicalRecord(id)

  if (!result.success || !result.data) {
    notFound()
  }

  return <MedicalRecordDetailContent record={result.data} />
}
