'use client'

import { useState } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { type Product } from '@/app/(protected)/products/columns'
import { EditProductDialog } from './edit-product-dialog'
import { DeleteConfirmationDialog } from '@/components/ui/delete-confirmation-dialog'
import { deleteProduct } from '@/lib/actions/products'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { Pencil, Trash2 } from 'lucide-react'

interface ProductsGalleryProps {
  products: Product[]
  canEdit?: boolean
}

export function ProductsGallery({ products, canEdit = true }: ProductsGalleryProps) {
  const router = useRouter()
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null)

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'GHS',
    }).format(amount / 100)
  }

  const handleDelete = async () => {
    if (!deletingProduct) return

    const result = await deleteProduct(deletingProduct.id)

    if (result.success) {
      toast.success('Product deleted successfully')
      router.refresh()
    } else {
      toast.error(result.error || 'Failed to delete product')
    }
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 w-full">
        {products.map((product) => {
          return (
            <Card
              key={product.id}
              className="flex flex-col hover:shadow-lg transition-shadow h-full overflow-hidden"
            >
              {product.image && (
                <div className="aspect-square w-full overflow-hidden rounded-t-lg flex-shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <CardHeader className="flex-shrink-0 p-5 pb-3">
                <CardTitle className="text-base sm:text-lg break-words hyphens-auto">
                  {product.name}
                </CardTitle>
                {product.description && (
                  <CardDescription className="break-words line-clamp-2 sm:line-clamp-3 text-xs sm:text-sm mt-2">
                    {product.description}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent className="flex-grow p-5 pt-3 min-h-0">
                <div className="space-y-2 sm:space-y-2.5">
                  <div className="flex flex-col sm:flex-row sm:justify-between gap-1 text-xs sm:text-sm">
                    <span className="text-muted-foreground whitespace-nowrap">Selling Price:</span>
                    <span className="font-medium break-words">{formatCurrency(product.price)}</span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:justify-between gap-1 text-xs sm:text-sm">
                    <span className="text-muted-foreground whitespace-nowrap">
                      Available Items:
                    </span>
                    <span
                      className={`font-medium break-words ${product.stockQuantity <= (product.reorderLevel || 10) ? 'text-destructive' : ''}`}
                    >
                      {(product.stockQuantity || 0) * (product.quantityPerPack || 1)}
                    </span>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex flex-col gap-2 flex-shrink-0 p-5 pt-3">
                <div className="flex flex-col gap-2 w-full">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-xs sm:text-sm"
                    onClick={() => setEditingProduct(product)}
                    disabled={!canEdit}
                  >
                    <Pencil className="h-3 w-3 sm:h-4 sm:w-4 mr-2 flex-shrink-0" />
                    Edit
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="w-full text-xs sm:text-sm"
                    onClick={() => setDeletingProduct(product)}
                    disabled={!canEdit}
                  >
                    <Trash2 className="h-3 w-3 sm:h-4 sm:w-4 mr-2 flex-shrink-0" />
                    Delete
                  </Button>
                </div>
              </CardFooter>
            </Card>
          )
        })}
      </div>

      {editingProduct && (
        <EditProductDialog
          product={editingProduct}
          open={!!editingProduct}
          onOpenChange={(open) => {
            if (!open) {
              setEditingProduct(null)
              router.refresh()
            }
          }}
        />
      )}

      {deletingProduct && (
        <DeleteConfirmationDialog
          open={!!deletingProduct}
          onOpenChange={(open) => {
            if (!open) setDeletingProduct(null)
          }}
          onConfirm={handleDelete}
          title="Delete Product"
          description="Are you sure you want to delete this product? This action cannot be undone."
          itemName={deletingProduct.name}
        />
      )}
    </>
  )
}
