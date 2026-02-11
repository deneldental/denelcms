'use client'

import { useRouter } from 'next/navigation'
import { DataTable } from '@/components/data-table/data-table'
import { columns } from './columns'
import { type Product } from './columns'

interface InventoryClientProps {
  products: Product[]
  canEdit?: boolean
}

export function InventoryClient({ products, canEdit = true }: InventoryClientProps) {
  const router = useRouter()

  const handleRowClick = (product: Product) => {
    router.push(`/inventory/${product.id}`)
  }

  // Add onRowClick handler to each product for row click functionality
  const productsWithClick = products.map((product) => ({
    ...product,
    onRowClick: () => handleRowClick(product),
  }))

  return (
    <DataTable
      columns={columns}
      data={productsWithClick}
      initialColumnVisibility={{ sku: false }}
      meta={{ onRowClick: handleRowClick, canEdit }}
    />
  )
}
