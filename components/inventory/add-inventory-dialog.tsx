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
import { createInventoryItem } from '@/lib/actions/inventory'
import { toast } from 'sonner'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { getUnits } from '@/lib/actions/units'
import { getCategories } from '@/lib/actions/categories'
import { SingleImageUpload } from '@/components/products/single-image-upload'

interface AddInventoryDialogProps {
  buttonText?: string
  disabled?: boolean
}

export function AddInventoryDialog({
  buttonText = 'Add Item',
  disabled = false,
}: AddInventoryDialogProps) {
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  interface Unit {
    id: string
    name: string
    displayName?: string | null
  }
  interface Category {
    id: string
    name: string
  }
  const [unitsList, setUnitsList] = useState<Unit[]>([])
  const [categoriesList, setCategoriesList] = useState<Category[]>([])
  const [image, setImage] = useState<string>('')
  const [itemName, setItemName] = useState<string>('')

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

    interface InventoryData {
      name: string
      unit: string
      sku: string
      category: string
      stockQuantity: number
      reorderLevel?: number
      description?: string
      image?: string | null
    }
    const data: InventoryData = {
      name,
      unit,
      sku: `INV-${Date.now()}`, // Auto-generate SKU
      category,
      stockQuantity,
      reorderLevel: 10, // Default value
      description: '',
      image: image || null,
    }

    const result = await createInventoryItem(data)

    setIsLoading(false)

    if (result.success) {
      setOpen(false)
      setImage('')
      toast.success('Inventory item created successfully.')
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
            <DialogTitle>Add Inventory Item</DialogTitle>
            <DialogDescription>Add a new item to the clinic inventory.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Item Name</Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="e.g., Gloves"
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="unit">Unit</Label>
                <Select name="unit" required>
                  <SelectTrigger>
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
              <Label htmlFor="category">Category</Label>
              <Select name="category" required>
                <SelectTrigger>
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
              <Label htmlFor="stockQuantity">Quantity</Label>
              <Input
                id="stockQuantity"
                name="stockQuantity"
                type="number"
                defaultValue="0"
                required
              />
              <p className="text-xs text-muted-foreground">Initial stock quantity</p>
            </div>
            <div className="space-y-2">
              <Label>Item Image (Optional)</Label>
              <SingleImageUpload
                image={image || null}
                onChange={(url) => setImage(url || '')}
                maxSize={5 * 1024 * 1024}
                folder="inventory"
                entityName={itemName || 'item'}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Item
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
