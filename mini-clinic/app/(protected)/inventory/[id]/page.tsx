import { getInventoryItem } from '@/lib/actions/inventory'
import { notFound } from 'next/navigation'
import { InventoryDetailContent } from '@/components/inventory/inventory-detail-content'

export default async function InventoryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const result = await getInventoryItem(id)

  if (!result.success || !result.data) {
    notFound()
  }

  return <InventoryDetailContent product={result.data} />
}
