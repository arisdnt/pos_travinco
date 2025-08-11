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
import { BahanBaku } from "@/types"
import { useToast } from "@/components/ui/use-toast"

const bahanBakuSchema = z.object({
  nama_bahan_baku: z.string().min(1, "Nama bahan baku harus diisi"),
  stok: z.number().min(0, "Stok tidak boleh negatif"),
  unit: z.string().min(1, "Unit harus diisi"),
})

type BahanBakuFormData = z.infer<typeof bahanBakuSchema>

interface BahanBakuFormProps {
  item?: BahanBaku | null
  onClose: () => void
  onSuccess: () => void
}

export function BahanBakuForm({ item, onClose, onSuccess }: BahanBakuFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<BahanBakuFormData>({
    resolver: zodResolver(bahanBakuSchema),
    defaultValues: {
      nama_bahan_baku: item?.nama_bahan_baku || "",
      stok: item?.stok || 0,
      unit: item?.unit || "",
    },
  })

  const onSubmit = async (data: BahanBakuFormData) => {
    setIsLoading(true)
    try {
      // TODO: Implement Supabase integration
      console.log('Form data:', data)
      toast({
        title: "Berhasil",
        description: item ? "Bahan baku berhasil diperbarui" : "Bahan baku berhasil ditambahkan",
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
          {item ? "Edit Bahan Baku" : "Tambah Bahan Baku"}
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
            <Label htmlFor="nama_bahan_baku">Nama Bahan Baku</Label>
            <Input
              id="nama_bahan_baku"
              {...register("nama_bahan_baku")}
              placeholder="Masukkan nama bahan baku"
            />
            {errors.nama_bahan_baku && (
              <p className="text-sm text-red-500">{errors.nama_bahan_baku.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="stok">Stok</Label>
            <Input
              id="stok"
              type="number"
              {...register("stok", { valueAsNumber: true })}
              placeholder="Masukkan jumlah stok"
            />
            {errors.stok && (
              <p className="text-sm text-red-500">{errors.stok.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="unit">Unit</Label>
            <Input
              id="unit"
              {...register("unit")}
              placeholder="Masukkan unit (kg, liter, pcs, dll)"
            />
            {errors.unit && (
              <p className="text-sm text-red-500">{errors.unit.message}</p>
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