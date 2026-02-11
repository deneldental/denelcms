'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ProductsGallery } from '@/components/products/products-gallery'
import { SalesView } from '@/components/products/sales-view'
import { AddProductDialog } from '@/components/products/add-product-dialog'
import { ProductsLockToggle } from '@/components/products/products-lock-toggle'
import { type Product } from './columns'

interface ProductsClientProps {
  products: Product[]
  isLocked: boolean
  isAdmin: boolean
}

export function ProductsClient({ products, isLocked, isAdmin }: ProductsClientProps) {
  const canEdit = !isLocked || isAdmin

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Products</h1>
          <p className="text-muted-foreground">
            Manage retail products, track sales, and manage inventory.
          </p>
        </div>
        <ProductsLockToggle isLocked={isLocked} isAdmin={isAdmin} />
      </div>

      <Tabs defaultValue="products" className="w-full">
        <TabsList>
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="sales">Sales</TabsTrigger>
        </TabsList>

        <TabsContent value="products" className="space-y-4">
          <div className="flex justify-end">
            <AddProductDialog disabled={!canEdit} />
          </div>
          <ProductsGallery products={products} canEdit={canEdit} />
        </TabsContent>

        <TabsContent value="sales" className="space-y-4">
          <SalesView />
        </TabsContent>
      </Tabs>
    </div>
  )
}
