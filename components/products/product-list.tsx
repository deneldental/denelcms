'use client'

import { DataTable } from '@/components/data-table/data-table'
import { columns, type Product } from '@/app/(protected)/products/columns'

interface ProductListProps {
  data: Product[]
}

export function ProductList({ data }: ProductListProps) {

  return (
    <DataTable
      columns={columns}
      data={data}
    // onRowClick={(row) => router.push(`/products/${row.id}`)}
    />
  )
}
