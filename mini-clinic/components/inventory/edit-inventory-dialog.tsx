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
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2 } from 'lucide-react'
import { updateInventoryItem } from '@/lib/actions/inventory'
import { toast } from 'sonner'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { type Product } from '@/app/(protected)/inventory/columns'
import { useRouter } from 'next/navigation'
import { getUnits } from '@/lib/actions/units'
import { getCategories } from '@/lib/actions/categories'
import { SingleImageUpload } from '@/components/products/single-image-upload'

interface EditInventoryDialogProps {
  product: Product
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EditInventoryDialog({ product, open, onOpenChange }: EditInventoryDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const [unitsList, setUnitsList] = useState<Array<{ id: string; name: string; displayName: string | null }>>([])
  const [categoriesList, setCategoriesList] = useState<Array<{ id: string; name: string }>>([])
  const [image, setImage] = useState<string>(product.image || '')

  // Update image when product changes - done during render to avoid cascading updates
  const [prevProductId, setPrevProductId] = useState(product.id)
  if (product.id !== prevProductId) {
    setPrevProductId(product.id)
    setImage(product.image || '')
  }
  useEffect(() => {
    if (open) {
      getUnits().then((res) => {
        if (res.success) setUnitsList(res.data || [])
      })
      getCategories().then((res) => {
        if (res.success) setCategoriesList(res.data || [])
      })
    }
  }, [open])

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsLoading(true)

    const formData = new FormData(event.currentTarget)

    const name = formData.get('name') as string
    const unit = formData.get('unit') as string
    const category = formData.get('category') as string
    const stockQuantity = parseInt(formData.get('stockQuantity') as string)

    const data = {
      name,
      unit,
      category,
      stockQuantity,
      reorderLevel: product.reorderLevel || 10,
      description: product.description || '',
      image: image || null,
    }

    const result = await updateInventoryItem(product.id, data)

    setIsLoading(false)

    if (result.success) {
      onOpenChange(false)
      toast.success('Inventory item updated successfully.')
      router.refresh()
    } else {
      toast.error(result.error || 'Something went wrong.')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={onSubmit}>
          <DialogHeader>
            <DialogTitle>Edit Inventory Item</DialogTitle>
            <DialogDescription>Update inventory item details.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Item Name</Label>
                <Input id="edit-name" name="name" defaultValue={product.name} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-unit">Unit</Label>
                <Select name="unit" defaultValue={product.unit || ''} required>
                  <SelectTrigger id="edit-unit">
                    <SelectValue placeholder="Select Unit" />
                  </SelectTrigger>
                  <SelectContent>
                    {unitsList.map((unit) => (
                      <SelectItem key={unit.id} value={unit.name}>
                        {unit.displayName || unit.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-category">Category</Label>
              <Select name="category" defaultValue={product.category || ''} required>
                <SelectTrigger id="edit-category">
                  <SelectValue placeholder="Select Category" />
                </SelectTrigger>
                <SelectContent>
                  {categoriesList.map((category) => (
                    <SelectItem key={category.id} value={category.name}>
                      {category.name.charAt(0).toUpperCase() + category.name.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-stockQuantity">Quantity</Label>
              <Input
                id="edit-stockQuantity"
                name="stockQuantity"
                type="number"
                defaultValue={product.stockQuantity}
                required
              />
              <p className="text-xs text-muted-foreground">Current inventory quantity</p>
            </div>
            <div className="space-y-2">
              <Label>Item Image (Optional)</Label>
              <SingleImageUpload
                image={image || null}
                onChange={(url) => setImage(url || '')}
                maxSize={5 * 1024 * 1024}
                folder="inventory"
                entityName={product.name}
              />
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
