'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Save, ShoppingCart } from 'lucide-react';
import { supabase, getCurrentUser } from '@/lib/supabase';
import { toast } from 'sonner';
import { Navbar } from '@/components/layout/navbar';
import { formatCurrency } from '@/lib/utils';

interface ProdukJadi {
  id: string;
  nama_produk_jadi: string;
  harga_jual: number;
  sku: string;
}

interface Penjualan {
  id: string;
  produk_jadi_id: string;
  jumlah: number;
  total_harga: number;
  tanggal: string;
  catatan: string;
  produk_jadi: {
    id: string;
    nama_produk_jadi: string;
    harga_jual: number;
    sku: string;
  };
}

export default function EditPenjualanPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [produkJadiList, setProdukJadiList] = useState<ProdukJadi[]>([]);
  const [formData, setFormData] = useState({
    produk_jadi_id: '',
    jumlah: 1,
    total_harga: 0,
    tanggal: new Date().toISOString().split('T')[0],
    catatan: ''
  });

  useEffect(() => {
    if (id) {
      fetchData();
    }
  }, [id]);

  useEffect(() => {
    // Calculate total when quantity changes
    const selectedProduk = produkJadiList.find(p => p.id === formData.produk_jadi_id);
    if (selectedProduk) {
      const total = selectedProduk.harga_jual * formData.jumlah;
      setFormData(prev => ({ ...prev, total_harga: total }));
    }
  }, [formData.jumlah, formData.produk_jadi_id, produkJadiList]);

  const fetchData = async () => {
    try {
      setInitialLoading(true);
      const user = await getCurrentUser();
      if (!user) return;
      
      // Fetch produk jadi and penjualan data in parallel
      const [produkResponse, penjualanResponse] = await Promise.all([
        supabase
          .from('produk_jadi')
          .select('id, nama_produk_jadi, harga_jual, sku')
          .order('nama_produk_jadi'),
        supabase
          .from('penjualan')
          .select(`
            *,
            produk_jadi (
              id,
              nama_produk_jadi,
              harga_jual,
              sku
            )
          `)
          .eq('id', id)
          .single()
      ]);

      if (produkResponse.error) throw produkResponse.error;
      if (penjualanResponse.error) throw penjualanResponse.error;

      const penjualan = penjualanResponse.data as Penjualan;
      setProdukJadiList(produkResponse.data || []);
      
      setFormData({
        produk_jadi_id: penjualan.produk_jadi_id,
        jumlah: penjualan.jumlah,
        total_harga: penjualan.total_harga,
        tanggal: penjualan.tanggal.split('T')[0], // Convert to date format
        catatan: penjualan.catatan || ''
      });
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Gagal memuat data penjualan');
      router.push('/dashboard/penjualan');
    } finally {
      setInitialLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) || 0 : value
    }));
  };

  const handleSelectChange = (value: string) => {
    setFormData(prev => ({ ...prev, produk_jadi_id: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.produk_jadi_id) {
      toast.error('Pilih produk terlebih dahulu');
      return;
    }

    if (formData.jumlah <= 0) {
      toast.error('Jumlah harus lebih dari 0');
      return;
    }

    setLoading(true);
    try {
      const user = await getCurrentUser();
      if (!user) {
        toast.error('Anda harus login terlebih dahulu');
        return;
      }

      // Check stock availability for the new quantity
      const { data: stokCheck, error: stokError } = await supabase
        .rpc('check_stok_tersedia', {
          produk_id: formData.produk_jadi_id,
          jumlah_jual: formData.jumlah
        });

      if (stokError) {
        console.error('Error checking stock:', stokError);
        toast.error('Gagal memeriksa stok bahan baku');
        return;
      }

      if (!stokCheck) {
        const produk = produkJadiList.find(p => p.id === formData.produk_jadi_id);
        toast.error(`Stok bahan baku tidak mencukupi untuk produksi ${produk?.nama_produk_jadi}`);
        return;
      }

      // Note: Editing penjualan is complex because it affects stock.
      // For now, we only allow editing basic info, not quantities that affect stock.
      // In a production system, you might want to:
      // 1. Reverse the original stock changes
      // 2. Apply new stock changes
      // 3. Or restrict editing to non-stock-affecting fields only
      
      const { error } = await supabase
        .from('penjualan')
        .update({
          tanggal: formData.tanggal,
          catatan: formData.catatan || null
          // Note: Not updating produk_jadi_id or jumlah to avoid stock inconsistencies
          // total_harga is calculated by database trigger
        })
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      toast.success('Informasi penjualan berhasil diperbarui');
      router.push(`/dashboard/penjualan/detail/${id}`);
    } catch (error) {
      console.error('Error updating penjualan:', error);
      toast.error('Gagal memperbarui penjualan');
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900">
        <Navbar title="Edit Penjualan" showBackButton />
        <div className="p-4 md:p-6">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-gray-400">Memuat data...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const selectedProduk = produkJadiList.find(p => p.id === formData.produk_jadi_id);

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <Navbar title="Edit Penjualan" showBackButton />
      
      <div className="p-4 md:p-6">
        <Card className="w-full shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" />
              Informasi Penjualan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Info Notice */}
              <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  <strong>Catatan:</strong> Untuk menjaga konsistensi stok, hanya tanggal dan catatan yang dapat diedit. 
                  Produk dan jumlah tidak dapat diubah karena sudah mempengaruhi stok bahan baku.
                </p>
              </div>

              {/* Current Product Info - Read Only */}
              <div className="space-y-4">
                <Label className="text-lg font-semibold">Informasi Penjualan</Label>
                <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Produk</Label>
                    <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-md border">
                      <p className="font-medium text-gray-900 dark:text-white">
                        {selectedProduk?.nama_produk_jadi || '-'}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {selectedProduk?.sku} - {selectedProduk ? formatCurrency(selectedProduk.harga_jual) : '-'}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Jumlah</Label>
                    <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-md border">
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">
                        {formData.jumlah.toLocaleString('id-ID')} unit
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Total Harga</Label>
                  <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {formatCurrency(formData.total_harga)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Editable Fields */}
              <div className="space-y-4">
                <Label className="text-lg font-semibold">Edit Informasi</Label>
                <div className="space-y-2">
                  <Label htmlFor="tanggal">Tanggal Penjualan <span className="text-red-500">*</span></Label>
                  <Input
                    id="tanggal"
                    name="tanggal"
                    type="date"
                    value={formData.tanggal}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>

                <div className="space-y-2">
                  <Label htmlFor="catatan">Catatan</Label>
                  <Textarea
                    id="catatan"
                    name="catatan"
                    value={formData.catatan}
                    onChange={handleInputChange}
                    placeholder="Catatan tambahan (opsional)"
                    rows={3}
                    className="w-full"
                  />
                </div>



                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-4 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.back()}
                    disabled={loading}
                    className="w-full sm:w-auto"
                  >
                    Batal
                  </Button>
                  <Button
                    type="submit"
                    disabled={loading}
                    className="flex items-center justify-center gap-2 w-full sm:w-auto sm:flex-1"
                  >
                    <Save className="w-4 h-4" />
                    {loading ? 'Menyimpan...' : 'Simpan Perubahan'}
                  </Button>
                </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}