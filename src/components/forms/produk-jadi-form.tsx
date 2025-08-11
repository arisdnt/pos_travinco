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
      console.log('Form data:', data)
      toast({
        title: "Berhasil",
        description: item ? "Produk jadi berhasil diperbarui" : "Produk jadi berhasil ditambahkan",
      })
      onSuccess()
      onClose()
    } catch (error) {
      console.error('Error:', error)
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
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg font-semibold">
          {item ? "Edit Produk Jadi" : "Tambah Produk Jadi"}
        </CardTitle>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="h-6 w-6 p-0"
        >
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nama_produk_jadi">Nama Produk Jadi</Label>
            <Input
              id="nama_produk_jadi"
              {...register("nama_produk_jadi")}
              placeholder="Masukkan nama produk jadi"
            />
            {errors.nama_produk_jadi && (
              <p className="text-sm text-red-500">{errors.nama_produk_jadi.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="sku">SKU</Label>
            <Input
              id="sku"
              {...register("sku")}
              placeholder="Masukkan SKU produk"
            />
            {errors.sku && (
              <p className="text-sm text-red-500">{errors.sku.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="harga_jual">Harga Jual</Label>
            <Input
              id="harga_jual"
              type="number"
              {...register("harga_jual", { valueAsNumber: true })}
              placeholder="Masukkan harga jual"
            />
            {errors.harga_jual && (
              <p className="text-sm text-red-500">{errors.harga_jual.message}</p>
            )}
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Batal
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="flex-1"
            >
              {isLoading ? "Menyimpan..." : item ? "Perbarui" : "Simpan"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}