export const runtime = 'edge';

import { getProducts } from '@/lib/actions/products'
import { getProductsLockStatus } from '@/lib/actions/settings'
import { ProductsClient } from './products-client'

export default async function ProductsPage() {
  const [productsResult, lockStatusResult] = await Promise.all([
    getProducts(),
    getProductsLockStatus(),
  ])

  const products = productsResult.success ? productsResult.data : []
  const lockStatus = lockStatusResult.success
    ? lockStatusResult.data
    : { isLocked: false, isAdmin: false }

  return (
    <ProductsClient
      products={products || []}
      isLocked={lockStatus.isLocked}
      isAdmin={lockStatus.isAdmin}
    />
  )
}
