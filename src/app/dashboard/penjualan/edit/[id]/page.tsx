'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Save, ShoppingCart, Loader2 } from 'lucide-react';
import { supabase, getProdukJadi, getCurrentUser } from '@/lib/supabase';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/utils';

export default function EditPenjualanPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [produkJadi, setProdukJadi] = useState<any[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [formData, setFormData] = useState({
    produk_jadi_id: '',
    jumlah: 1,
    harga_satuan: 0,
    total_harga: 0,
    nama_pembeli: '',
    alamat_pembeli: '',
    metode_pembayaran: 'cash'
  });

  useEffect(() => {
    fetchData();
  }, [id]);

  useEffect(() => {
    // Calculate total when quantity or price changes
    const total = formData.harga_satuan * formData.jumlah;
    setFormData(prev => ({ ...prev, total_harga: total }));
  }, [formData.harga_satuan, formData.jumlah]);

  const fetchData = async () => {
    try {
      setInitialLoading(true);
      
      // Fetch produk jadi and penjualan data in parallel
      const [produkData, penjualanResponse] = await Promise.all([
        getProdukJadi(),
        supabase
          .from('penjualan')
          .select(`
            *,
            produk_jadi (
              id,
              nama_produk_jadi,
              harga_jual,
              stok
            )
          `)
          .eq('id', id)
          .single()
      ]);

      if (penjualanResponse.error) {
        throw penjualanResponse.error;
      }

      const penjualan = penjualanResponse.data;
      setProdukJadi(produkData);
      setSelectedProduct(penjualan.produk_jadi);
      
      setFormData({
        produk_jadi_id: penjualan.produk_jadi_id,
        jumlah: penjualan.jumlah,
        harga_satuan: penjualan.harga_satuan,
        total_harga: penjualan.total_harga,
        nama_pembeli: penjualan.nama_pembeli,
        alamat_pembeli: penjualan.alamat_pembeli || '',
        metode_pembayaran: penjualan.metode_pembayaran
      });
    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast.error('Gagal memuat data penjualan');
      router.push('/dashboard/penjualan');
    } finally {
      setInitialLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) || 0 : value
    }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleProductChange = (productId: string) => {
    const product = produkJadi.find(p => p.id === productId);
    if (product) {
      setSelectedProduct(product);
      setFormData(prev => ({
        ...prev,
        produk_jadi_id: productId,
        harga_satuan: product.harga_jual
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const user = await getCurrentUser();
      if (!user) {
        toast.error('Anda harus login terlebih dahulu');
        return;
      }

      const { error } = await supabase
        .from('penjualan')
        .update({
          produk_jadi_id: formData.produk_jadi_id,
          jumlah: formData.jumlah,
          harga_satuan: formData.harga_satuan,
          total_harga: formData.total_harga,
          nama_pembeli: formData.nama_pembeli,
          alamat_pembeli: formData.alamat_pembeli || null,
          metode_pembayaran: formData.metode_pembayaran,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;

      toast.success('Transaksi penjualan berhasil diperbarui!');
      router.push('/dashboard/penjualan');
    } catch (error: any) {
      console.error('Error updating penjualan:', error);
      toast.error(error.message || 'Gagal memperbarui transaksi penjualan');
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex items-center gap-2">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Memuat data...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 mx-auto max-w-4xl md:p-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.back()}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Kembali
        </Button>
        <div className="flex items-center gap-2">
          <ShoppingCart className="w-6 h-6 text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Edit Transaksi Penjualan
          </h1>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Product Information */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" />
              Informasi Produk
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="produk_jadi_id">Produk *</Label>
                <Select
                  value={formData.produk_jadi_id}
                  onValueChange={handleProductChange}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih produk" />
                  </SelectTrigger>
                  <SelectContent>
                    {produkJadi.map((produk) => (
                      <SelectItem key={produk.id} value={produk.id}>
                        {produk.nama_produk_jadi} - {formatCurrency(produk.harga_jual)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedProduct && (
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Stok tersedia: {selectedProduct.stok} unit
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="jumlah">Jumlah *</Label>
                <Input
                  id="jumlah"
                  name="jumlah"
                  type="number"
                  min="1"
                  max={selectedProduct?.stok || undefined}
                  value={formData.jumlah}
                  onChange={handleInputChange}
                  placeholder="Masukkan jumlah"
                  required
                  className="w-full"
                />
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2 mt-4">
              <div className="space-y-2">
                <Label htmlFor="harga_satuan">Harga Satuan</Label>
                <Input
                  id="harga_satuan"
                  name="harga_satuan"
                  type="text"
                  value={formatCurrency(formData.harga_satuan)}
                  disabled
                  className="w-full bg-gray-100 dark:bg-gray-700"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="total_harga">Total Harga</Label>
                <Input
                  id="total_harga"
                  name="total_harga"
                  type="text"
                  value={formatCurrency(formData.total_harga)}
                  disabled
                  className="w-full bg-gray-100 dark:bg-gray-700 font-semibold text-green-600"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Customer Information */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Informasi Pembeli</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="nama_pembeli">Nama Pembeli *</Label>
                <Input
                  id="nama_pembeli"
                  name="nama_pembeli"
                  value={formData.nama_pembeli}
                  onChange={handleInputChange}
                  placeholder="Masukkan nama pembeli"
                  required
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="metode_pembayaran">Metode Pembayaran *</Label>
                <Select
                  value={formData.metode_pembayaran}
                  onValueChange={(value) => handleSelectChange('metode_pembayaran', value)}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih metode pembayaran" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="transfer">Transfer Bank</SelectItem>
                    <SelectItem value="credit_card">Kartu Kredit</SelectItem>
                    <SelectItem value="e_wallet">E-Wallet</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2 mt-4">
              <Label htmlFor="alamat_pembeli">Alamat Pembeli</Label>
              <Input
                id="alamat_pembeli"
                name="alamat_pembeli"
                value={formData.alamat_pembeli}
                onChange={handleInputChange}
                placeholder="Masukkan alamat pembeli (opsional)"
                className="w-full"
              />
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            className="flex-1"
          >
            Batal
          </Button>
          <Button
            type="submit"
            disabled={loading}
            className="flex-1 flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {loading ? 'Menyimpan...' : 'Simpan Perubahan'}
          </Button>
        </div>
      </form>
    </div>
  );
}