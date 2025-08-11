'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { X } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

const pembelianSchema = z.object({
  bahan_baku_id: z.string().min(1, 'Bahan baku harus dipilih'),
  jumlah: z.number().min(0.01, 'Jumlah harus lebih dari 0'),
  harga_beli: z.number().min(0, 'Harga beli tidak boleh negatif'),
  tanggal: z.string().min(1, 'Tanggal harus diisi'),
  catatan: z.string().optional(),
});

type PembelianFormData = z.infer<typeof pembelianSchema>;

interface PembelianFormProps {
  pembelian?: any;
  onClose: () => void;
}

// Mock data untuk dropdown bahan baku
const mockBahanBaku = [
  { id: '1', nama_bahan_baku: 'Alkohol 96%', unit: 'ml' },
  { id: '2', nama_bahan_baku: 'Essential Oil Lavender', unit: 'ml' },
  { id: '3', nama_bahan_baku: 'Essential Oil Rose', unit: 'ml' },
  { id: '4', nama_bahan_baku: 'Botol Spray 50ml', unit: 'buah' },
  { id: '5', nama_bahan_baku: 'Botol Spray 30ml', unit: 'buah' },
];

export default function PembelianForm({ pembelian, onClose }: PembelianFormProps) {
  const { toast } = useToast();
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<PembelianFormData>({
    resolver: zodResolver(pembelianSchema),
    defaultValues: {
      bahan_baku_id: pembelian?.bahan_baku_id || '',
      jumlah: pembelian?.jumlah || 0,
      harga_beli: pembelian?.harga_beli || 0,
      tanggal: pembelian?.tanggal 
        ? new Date(pembelian.tanggal).toISOString().slice(0, 16)
        : new Date().toISOString().slice(0, 16),
      catatan: pembelian?.catatan || '',
    },
  });

  const selectedBahanBaku = watch('bahan_baku_id');
  const selectedBahan = mockBahanBaku.find(b => b.id === selectedBahanBaku);

  const onSubmit = async (data: PembelianFormData) => {
    try {
      // TODO: Implement Supabase integration
      console.log('Form data:', data)
      toast({
        title: pembelian ? 'Pembelian berhasil diperbarui' : 'Pembelian berhasil ditambahkan',
        description: 'Data pembelian telah disimpan ke database.',
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
            {pembelian ? 'Edit Pembelian' : 'Tambah Pembelian'}
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
              <Label htmlFor="jumlah">
                Jumlah {selectedBahan && `(${selectedBahan.unit})`}
              </Label>
              <Input
                id="jumlah"
                type="number"
                step="0.01"
                placeholder="Masukkan jumlah"
                {...register('jumlah', { valueAsNumber: true })}
              />
              {errors.jumlah && (
                <p className="text-sm text-red-500">{errors.jumlah.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="harga_beli">Harga Beli (Rp)</Label>
              <Input
                id="harga_beli"
                type="number"
                step="1"
                placeholder="Masukkan harga beli"
                {...register('harga_beli', { valueAsNumber: true })}
              />
              {errors.harga_beli && (
                <p className="text-sm text-red-500">{errors.harga_beli.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="tanggal">Tanggal Pembelian</Label>
              <Input
                id="tanggal"
                type="datetime-local"
                {...register('tanggal')}
              />
              {errors.tanggal && (
                <p className="text-sm text-red-500">{errors.tanggal.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="catatan">Catatan (Opsional)</Label>
              <textarea
                id="catatan"
                rows={3}
                placeholder="Masukkan catatan pembelian"
                {...register('catatan')}
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
              {errors.catatan && (
                <p className="text-sm text-red-500">{errors.catatan.message}</p>
              )}
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Batal
              </Button>
              <Button type="submit">
                {pembelian ? 'Perbarui' : 'Simpan'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}