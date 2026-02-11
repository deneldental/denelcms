'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2 } from 'lucide-react'
import { updateProduct } from '@/lib/actions/products'
import { toast } from 'sonner'
import { type Product } from '@/app/(protected)/products/columns'
import { useRouter } from 'next/navigation'
import { SingleImageUpload } from './single-image-upload'

interface EditProductDialogProps {
  product: Product
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EditProductDialog({ product, open, onOpenChange }: EditProductDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const [image, setImage] = useState<string | null>(product.image || null)

  // Removed useEffect to avoid setState in effect warning.
  // Using key on the DialogContent instead to reset state.

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsLoading(true)

    const formData = new FormData(event.currentTarget)

    const name = formData.get('name') as string
    const quantityPerPack = parseInt(formData.get('quantityPerPack') as string)
    const price = parseFloat(formData.get('price') as string) * 100 // Convert to cents (per single item)
    const stockQuantity = parseInt(formData.get('stockQuantity') as string)

    if (isNaN(price)) {
      toast.error('Please enter a valid selling price')
      setIsLoading(false)
      return
    }

    if (isNaN(quantityPerPack) || quantityPerPack < 1) {
      toast.error('Quantity per pack must be at least 1')
      setIsLoading(false)
      return
    }

    const data: Partial<Product> = {
      name,
      price: Math.round(price), // Selling price per single item
      stockQuantity, // Number of packs
      quantityPerPack, // Number of items per pack
      // Keep existing reorderLevel and description if they are not in form
      reorderLevel: product.reorderLevel || 10,
      description: product.description || '',
      image: image || null, // Product image
    }

    const result = await updateProduct(product.id, data)

    setIsLoading(false)

    if (result.success) {
      onOpenChange(false)
      toast.success('Product updated successfully.')
      router.refresh()
    } else {
      toast.error(result.error || 'Something went wrong.')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]" key={`${product.id}-${open}`}>
        <form onSubmit={onSubmit}>
          <DialogHeader>
            <DialogTitle>Edit Product</DialogTitle>
            <DialogDescription>Update product details for retail sale.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Product Image</Label>
              <div className="max-w-[200px] mx-auto">
                <SingleImageUpload
                  image={image}
                  onChange={setImage}
                  maxSize={5 * 1024 * 1024}
                  folder="products"
                  entityName={product.name}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-name">Product Name</Label>
              <Input id="edit-name" name="name" defaultValue={product.name} required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-quantityPerPack">Quantity per Pack</Label>
                <Input
                  id="edit-quantityPerPack"
                  name="quantityPerPack"
                  type="number"
                  defaultValue={product.quantityPerPack || 1}
                  min="1"
                  required
                />
                <p className="text-xs text-muted-foreground">Items in one pack</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-stockQuantity">Number of Packs</Label>
                <Input
                  id="edit-stockQuantity"
                  name="stockQuantity"
                  type="number"
                  defaultValue={product.stockQuantity}
                  min="0"
                  required
                />
                <p className="text-xs text-muted-foreground">Packs in stock</p>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-price">Selling Price per Item (₵)</Label>
              <Input
                id="edit-price"
                name="price"
                type="number"
                step="0.01"
                defaultValue={product.price / 100}
                required
              />
              <p className="text-xs text-muted-foreground">
                Price for a single item (not per pack)
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-sku">SKU</Label>
              <Input
                id="edit-sku"
                name="sku"
                defaultValue={product.sku || 'N/A'}
                disabled
                readOnly
              />
              <p className="text-xs text-muted-foreground">Product SKU (auto-generated)</p>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
