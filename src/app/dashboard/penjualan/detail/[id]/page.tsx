'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Edit, Trash2, ShoppingCart, User, MapPin, CreditCard, Calendar, Loader2 } from 'lucide-react';
import { supabase, getCurrentUser } from '@/lib/supabase';
import { toast } from 'sonner';
import { formatCurrency, formatDate } from '@/lib/utils';

export default function DetailPenjualanPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [penjualan, setPenjualan] = useState<any>(null);

  useEffect(() => {
    fetchPenjualan();
  }, [id]);

  const fetchPenjualan = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('penjualan')
        .select(`
          *,
          produk_jadi (
            id,
            nama_produk_jadi,
            sku,
            harga_jual,
            stok
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      setPenjualan(data);
    } catch (error: any) {
      console.error('Error fetching penjualan:', error);
      toast.error('Gagal memuat data penjualan');
      router.push('/dashboard/penjualan');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Apakah Anda yakin ingin menghapus transaksi penjualan ini?')) {
      return;
    }

    setDeleting(true);
    try {
      const user = await getCurrentUser();
      if (!user) {
        toast.error('Anda harus login terlebih dahulu');
        return;
      }

      const { error } = await supabase
        .from('penjualan')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Transaksi penjualan berhasil dihapus!');
      router.push('/dashboard/penjualan');
    } catch (error: any) {
      console.error('Error deleting penjualan:', error);
      toast.error(error.message || 'Gagal menghapus transaksi penjualan');
    } finally {
      setDeleting(false);
    }
  };

  const getPaymentMethodBadge = (method: string) => {
    const variants: { [key: string]: 'default' | 'secondary' | 'destructive' | 'outline' } = {
      cash: 'default',
      transfer: 'secondary',
      credit_card: 'outline',
      e_wallet: 'destructive'
    };

    const labels: { [key: string]: string } = {
      cash: 'Cash',
      transfer: 'Transfer Bank',
      credit_card: 'Kartu Kredit',
      e_wallet: 'E-Wallet'
    };

    return (
      <Badge variant={variants[method] || 'default'}>
        {labels[method] || method}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex items-center gap-2">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Memuat data...</span>
        </div>
      </div>
    );
  }

  if (!penjualan) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Transaksi Tidak Ditemukan
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Transaksi penjualan yang Anda cari tidak ditemukan.
          </p>
          <Button onClick={() => router.push('/dashboard/penjualan')}>
            Kembali ke Daftar Penjualan
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 mx-auto max-w-4xl md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
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
              Detail Transaksi Penjualan
            </h1>
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/dashboard/penjualan/edit/${id}`)}
            className="flex items-center gap-2"
          >
            <Edit className="w-4 h-4" />
            Edit
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleDelete}
            disabled={deleting}
            className="flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            {deleting ? 'Menghapus...' : 'Hapus'}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Product Information */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" />
              Informasi Produk
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Nama Produk
              </Label>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {penjualan.produk_jadi?.nama_produk_jadi}
              </p>
            </div>
            
            <div>
              <Label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                SKU
              </Label>
              <p className="text-gray-900 dark:text-white">
                {penjualan.produk_jadi?.sku}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Harga Satuan
                </Label>
                <p className="text-lg font-semibold text-blue-600">
                  {formatCurrency(penjualan.harga_satuan)}
                </p>
              </div>
              
              <div>
                <Label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Jumlah
                </Label>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {penjualan.jumlah} unit
                </p>
              </div>
            </div>

            <div className="pt-4 border-t">
              <Label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Total Harga
              </Label>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(penjualan.total_harga)}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Customer Information */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Informasi Pembeli
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Nama Pembeli
              </Label>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {penjualan.nama_pembeli}
              </p>
            </div>

            {penjualan.alamat_pembeli && (
              <div>
                <Label className="text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  Alamat
                </Label>
                <p className="text-gray-900 dark:text-white">
                  {penjualan.alamat_pembeli}
                </p>
              </div>
            )}

            <div>
              <Label className="text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1">
                <CreditCard className="w-4 h-4" />
                Metode Pembayaran
              </Label>
              <div className="mt-1">
                {getPaymentMethodBadge(penjualan.metode_pembayaran)}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Transaction Information */}
        <Card className="shadow-lg md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Informasi Transaksi
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <Label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  ID Transaksi
                </Label>
                <p className="text-gray-900 dark:text-white font-mono">
                  {penjualan.id}
                </p>
              </div>
              
              <div>
                <Label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Tanggal Transaksi
                </Label>
                <p className="text-gray-900 dark:text-white">
                  {formatDate(penjualan.created_at)}
                </p>
              </div>
              
              {penjualan.updated_at !== penjualan.created_at && (
                <div>
                  <Label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Terakhir Diperbarui
                  </Label>
                  <p className="text-gray-900 dark:text-white">
                    {formatDate(penjualan.updated_at)}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Label({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <label className={`block text-sm font-medium ${className}`}>
      {children}
    </label>
  );
}