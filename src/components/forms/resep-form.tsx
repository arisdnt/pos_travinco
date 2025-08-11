'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { X } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

const resepSchema = z.object({
  produk_jadi_id: z.string().min(1, 'Produk jadi harus dipilih'),
  bahan_baku_id: z.string().min(1, 'Bahan baku harus dipilih'),
  jumlah_dibutuhkan: z.number().min(0.01, 'Jumlah harus lebih dari 0'),
});

type ResepFormData = z.infer<typeof resepSchema>;

interface ResepFormProps {
  resep?: any;
  onClose: () => void;
}

// Mock data untuk dropdown
const mockProdukJadi = [
  { id: '1', nama_produk_jadi: 'Parfum Lavender 50ml' },
  { id: '2', nama_produk_jadi: 'Parfum Rose 30ml' },
];

const mockBahanBaku = [
  { id: '1', nama_bahan_baku: 'Alkohol 96%', unit: 'ml' },
  { id: '2', nama_bahan_baku: 'Essential Oil Lavender', unit: 'ml' },
  { id: '3', nama_bahan_baku: 'Essential Oil Rose', unit: 'ml' },
  { id: '4', nama_bahan_baku: 'Botol Spray 50ml', unit: 'buah' },
  { id: '5', nama_bahan_baku: 'Botol Spray 30ml', unit: 'buah' },
];

export default function ResepForm({ resep, onClose }: ResepFormProps) {
  const { toast } = useToast();
  const [selectedBahanBaku, setSelectedBahanBaku] = useState<any>(null);
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<ResepFormData>({
    resolver: zodResolver(resepSchema),
    defaultValues: {
      produk_jadi_id: resep?.produk_jadi_id || '',
      bahan_baku_id: resep?.bahan_baku_id || '',
      jumlah_dibutuhkan: resep?.jumlah_dibutuhkan || 0,
    },
  });

  const watchedBahanBaku = watch('bahan_baku_id');

  useEffect(() => {
    if (watchedBahanBaku) {
      const bahan = mockBahanBaku.find(b => b.id === watchedBahanBaku);
      setSelectedBahanBaku(bahan);
    }
  }, [watchedBahanBaku]);

  const onSubmit = async (data: ResepFormData) => {
    try {
      // TODO: Implement Supabase integration
      console.log('Form data:', data)
      toast({
        title: resep ? 'Resep berhasil diperbarui' : 'Resep berhasil ditambahkan',
        description: 'Data resep telah disimpan ke database.',
      });
      
      onClose();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Terjadi kesalahan saat menyimpan data.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md mx-4">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-lg font-semibold">
            {resep ? 'Edit Resep' : 'Tambah Resep'}
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="produk_jadi_id">Produk Jadi</Label>
              <select
                id="produk_jadi_id"
                {...register('produk_jadi_id')}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">Pilih Produk Jadi</option>
                {mockProdukJadi.map((produk) => (
                  <option key={produk.id} value={produk.id}>
                    {produk.nama_produk_jadi}
                  </option>
                ))}
              </select>
              {errors.produk_jadi_id && (
                <p className="text-sm text-red-500">{errors.produk_jadi_id.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="bahan_baku_id">Bahan Baku</Label>
              <select
                id="bahan_baku_id"
                {...register('bahan_baku_id')}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">Pilih Bahan Baku</option>
                {mockBahanBaku.map((bahan) => (
                  <option key={bahan.id} value={bahan.id}>
                    {bahan.nama_bahan_baku} ({bahan.unit})
                  </option>
                ))}
              </select>
              {errors.bahan_baku_id && (
                <p className="text-sm text-red-500">{errors.bahan_baku_id.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="jumlah_dibutuhkan">
                Jumlah Dibutuhkan {selectedBahanBaku && `(${selectedBahanBaku.unit})`}
              </Label>
              <Input
                id="jumlah_dibutuhkan"
                type="number"
                step="0.01"
                placeholder="Masukkan jumlah"
                {...register('jumlah_dibutuhkan', { valueAsNumber: true })}
              />
              {errors.jumlah_dibutuhkan && (
                <p className="text-sm text-red-500">{errors.jumlah_dibutuhkan.message}</p>
              )}
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Batal
              </Button>
              <Button type="submit">
                {resep ? 'Perbarui' : 'Simpan'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}