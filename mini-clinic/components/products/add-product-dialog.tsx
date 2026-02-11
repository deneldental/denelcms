'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus, Loader2 } from 'lucide-react'
import { createProduct } from '@/lib/actions/products'
import { toast } from 'sonner'
import { SingleImageUpload } from './single-image-upload'

interface AddProductDialogProps {
  buttonText?: string
  disabled?: boolean
}

export function AddProductDialog({
  buttonText = 'Add Product',
  disabled = false,
}: AddProductDialogProps) {
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [image, setImage] = useState<string | null>(null)
  const [productName, setProductName] = useState<string>('')

  useEffect(() => {
    if (!open) {
      // Reset image when dialog closes
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setImage(null)
    }
  }, [open])

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

    interface ProductData {
      name: string
      sku: string
      description?: string | null
      price: number
      costPrice?: number | null
      category?: string | null
      image?: string | null
      stockQuantity: number
      quantityPerPack: number
      reorderLevel?: number
    }
    const data: ProductData = {
      name,
      sku: `PRD-${Date.now()}`, // Auto-generate SKU
      price: Math.round(price), // Selling price per single item
      costPrice: null, // Will be set when product is sold (tracked in sales)
      stockQuantity, // Number of packs/units
      quantityPerPack, // Number of items per pack
      reorderLevel: 10, // Default value
      description: '',
      image: image || null, // Product image
    }

    const result = await createProduct(data)

    setIsLoading(false)

    if (result.success) {
      setOpen(false)
      toast.success('Product created successfully.')
    } else {
      toast.error(result.error || 'Something went wrong.')
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button disabled={disabled}>
          <Plus className="mr-2 h-4 w-4" />
          {buttonText}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={onSubmit}>
          <DialogHeader>
            <DialogTitle>Add Product</DialogTitle>
            <DialogDescription>Enter product details for retail sale.</DialogDescription>
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
                  entityName={productName || 'product'}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Product Name</Label>
              <Input
                id="name"
                name="name"
                placeholder="e.g., Toothbrush"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="quantityPerPack">Quantity per Pack</Label>
                <Input
                  id="quantityPerPack"
                  name="quantityPerPack"
                  type="number"
                  placeholder="12"
                  defaultValue="1"
                  min="1"
                  required
                />
                <p className="text-xs text-muted-foreground">Items in one pack</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="stockQuantity">Number of Packs</Label>
                <Input
                  id="stockQuantity"
                  name="stockQuantity"
                  type="number"
                  defaultValue="0"
                  min="0"
                  required
                />
                <p className="text-xs text-muted-foreground">Packs in stock</p>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="price">Selling Price per Item (₵)</Label>
              <Input
                id="price"
                name="price"
                type="number"
                step="0.01"
                placeholder="0.00"
                required
              />
              <p className="text-xs text-muted-foreground">
                Price for a single item (not per pack)
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Product
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
