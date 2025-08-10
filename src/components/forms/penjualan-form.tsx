'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { X, AlertTriangle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { formatCurrency } from '@/lib/utils';

const penjualanSchema = z.object({
  produk_jadi_id: z.string().min(1, 'Produk jadi harus dipilih'),
  jumlah: z.number().min(1, 'Jumlah harus minimal 1'),
  tanggal: z.string().min(1, 'Tanggal harus diisi'),
  catatan: z.string().optional(),
});

type PenjualanFormData = z.infer<typeof penjualanSchema>;

interface PenjualanFormProps {
  penjualan?: any;
  onClose: () => void;
}

// Mock data untuk dropdown produk jadi
const mockProdukJadi = [
  { 
    id: '1', 
    nama_produk_jadi: 'Parfum Lavender 50ml', 
    sku: 'LAV001',
    harga_jual: 150000,
    stok_tersedia: 15 // Mock calculated stock
  },
  { 
    id: '2', 
    nama_produk_jadi: 'Parfum Rose 30ml', 
    sku: 'ROS001',
    harga_jual: 120000,
    stok_tersedia: 8 // Mock calculated stock
  },
];

export default function PenjualanForm({ penjualan, onClose }: PenjualanFormProps) {
  const { toast } = useToast();
  const [selectedProduk, setSelectedProduk] = useState<any>(null);
  const [totalHarga, setTotalHarga] = useState(0);
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<PenjualanFormData>({
    resolver: zodResolver(penjualanSchema),
    defaultValues: {
      produk_jadi_id: penjualan?.produk_jadi_id || '',
      jumlah: penjualan?.jumlah || 1,
      tanggal: penjualan?.tanggal 
        ? new Date(penjualan.tanggal).toISOString().slice(0, 16)
        : new Date().toISOString().slice(0, 16),
      catatan: penjualan?.catatan || '',
    },
  });

  const watchedProduk = watch('produk_jadi_id');
  const watchedJumlah = watch('jumlah');

  useEffect(() => {
    if (watchedProduk) {
      const produk = mockProdukJadi.find(p => p.id === watchedProduk);
      setSelectedProduk(produk);
    }
  }, [watchedProduk]);

  useEffect(() => {
    if (selectedProduk && watchedJumlah) {
      setTotalHarga(selectedProduk.harga_jual * watchedJumlah);
    }
  }, [selectedProduk, watchedJumlah]);

  const onSubmit = async (data: PenjualanFormData) => {
    try {
      // Check stock availability
      if (selectedProduk && data.jumlah > selectedProduk.stok_tersedia) {
        toast({
          title: 'Stok Tidak Mencukupi',
          description: `Stok tersedia hanya ${selectedProduk.stok_tersedia} unit`,
          variant: 'destructive',
        });
        return;
      }

      // TODO: Implement Supabase integration
      console.log('Penjualan data:', {
        ...data,
        total_harga: totalHarga,
        harga_satuan: selectedProduk?.harga_jual
      });
      
      toast({
        title: penjualan ? 'Penjualan berhasil diperbarui' : 'Penjualan berhasil ditambahkan',
        description: 'Data penjualan telah disimpan ke database.',
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

  const isStokTidakCukup = selectedProduk && watchedJumlah > selectedProduk.stok_tersedia;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md mx-4">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-lg font-semibold">
            {penjualan ? 'Edit Penjualan' : 'Tambah Penjualan'}
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
                    {produk.nama_produk_jadi} ({produk.sku}) - {formatCurrency(produk.harga_jual)}
                  </option>
                ))}
              </select>
              {errors.produk_jadi_id && (
                <p className="text-sm text-red-500">{errors.produk_jadi_id.message}</p>
              )}
            </div>

            {selectedProduk && (
              <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-md space-y-2">
                <div className="flex justify-between text-sm">
                  <span>SKU:</span>
                  <span className="font-medium">{selectedProduk.sku}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Harga Satuan:</span>
                  <span className="font-medium">{formatCurrency(selectedProduk.harga_jual)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Stok Tersedia:</span>
                  <span className={`font-medium ${
                    selectedProduk.stok_tersedia < 5 ? 'text-red-500' : 'text-green-600'
                  }`}>
                    {selectedProduk.stok_tersedia} unit
                  </span>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="jumlah">Jumlah</Label>
              <Input
                id="jumlah"
                type="number"
                min="1"
                placeholder="Masukkan jumlah"
                {...register('jumlah', { valueAsNumber: true })}
                className={isStokTidakCukup ? 'border-red-500' : ''}
              />
              {errors.jumlah && (
                <p className="text-sm text-red-500">{errors.jumlah.message}</p>
              )}
              {isStokTidakCukup && (
                <div className="flex items-center space-x-2 text-sm text-red-500">
                  <AlertTriangle className="h-4 w-4" />
                  <span>Jumlah melebihi stok tersedia ({selectedProduk.stok_tersedia} unit)</span>
                </div>
              )}
            </div>

            {totalHarga > 0 && (
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Total Harga:</span>
                  <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                    {formatCurrency(totalHarga)}
                  </span>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="tanggal">Tanggal Penjualan</Label>
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
                placeholder="Masukkan catatan penjualan"
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
              <Button 
                type="submit" 
                disabled={isStokTidakCukup}
                className={isStokTidakCukup ? 'opacity-50 cursor-not-allowed' : ''}
              >
                {penjualan ? 'Perbarui' : 'Simpan'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}