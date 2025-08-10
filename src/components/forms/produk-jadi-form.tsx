"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { X } from "lucide-react"
import { ProdukJadi } from "@/types"
import { useToast } from "@/components/ui/use-toast"
import { generateSKU } from "@/lib/utils"

const produkJadiSchema = z.object({
  nama_produk_jadi: z.string().min(1, "Nama produk harus diisi"),
  sku: z.string().min(1, "SKU harus diisi"),
  harga_jual: z.number().min(0, "Harga jual tidak boleh negatif"),
})

type ProdukJadiFormData = z.infer<typeof produkJadiSchema>

interface ProdukJadiFormProps {
  item?: ProdukJadi | null
  onClose: () => void
  onSuccess: () => void
}

export function ProdukJadiForm({ item, onClose, onSuccess }: ProdukJadiFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ProdukJadiFormData>({
    resolver: zodResolver(produkJadiSchema),
    defaultValues: {
      nama_produk_jadi: item?.nama_produk_jadi || "",
      sku: item?.sku || "",
      harga_jual: item?.harga_jual || 0,
    },
  })

  const namaProduk = watch("nama_produk_jadi")

  const handleGenerateSKU = () => {
    if (namaProduk) {
      const newSKU = generateSKU(namaProduk)
      setValue("sku", newSKU)
    }
  }

  const onSubmit = async (data: ProdukJadiFormData) => {
    setIsLoading(true)
    try {
      // TODO: Implement Supabase integration
      console.log("Form data:", data)
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      toast({
        title: "Berhasil",
        description: item 
          ? "Produk jadi berhasil diperbarui" 
          : "Produk jadi berhasil ditambahkan",
      })
      
      onSuccess()
    } catch (error) {
      toast({
        title: "Error",
        description: "Terjadi kesalahan saat menyimpan data",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>
              {item ? "Edit Produk Jadi" : "Tambah Produk Jadi"}
            </CardTitle>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nama_produk_jadi">Nama Produk</Label>
              <Input
                id="nama_produk_jadi"
                {...register("nama_produk_jadi")}
                placeholder="Masukkan nama produk"
              />
              {errors.nama_produk_jadi && (
                <p className="text-sm text-red-500">
                  {errors.nama_produk_jadi.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="sku">SKU</Label>
              <div className="flex space-x-2">
                <Input
                  id="sku"
                  {...register("sku")}
                  placeholder="Masukkan SKU"
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleGenerateSKU}
                  disabled={!namaProduk}
                >
                  Generate
                </Button>
              </div>
              {errors.sku && (
                <p className="text-sm text-red-500">{errors.sku.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="harga_jual">Harga Jual (Rp)</Label>
              <Input
                id="harga_jual"
                type="number"
                step="1000"
                {...register("harga_jual", { valueAsNumber: true })}
                placeholder="Masukkan harga jual"
              />
              {errors.harga_jual && (
                <p className="text-sm text-red-500">{errors.harga_jual.message}</p>
              )}
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Batal
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Menyimpan..." : "Simpan"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}