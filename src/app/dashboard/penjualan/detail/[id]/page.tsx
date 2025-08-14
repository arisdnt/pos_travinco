'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ShoppingCart, Calendar, Package, DollarSign } from 'lucide-react';
import { supabase, getCurrentUser } from '@/lib/supabase';
import { toast } from 'sonner';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { Navbar, createNavbarActions } from '@/components/layout/navbar';
import { DateTimeDisplay } from '@/components/ui/date-time-display';

interface Penjualan {
  id: string;
  jumlah: number;
  total_harga: number;
  tanggal: string;
  catatan: string;
  created_at: string;
  produk_jadi: {
    id: string;
    nama_produk_jadi: string;
    sku: string;
    harga_jual: number;
  };
}

export default function DetailPenjualanPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [penjualan, setPenjualan] = useState<Penjualan | null>(null);

  useEffect(() => {
    if (id) {
      fetchPenjualan();
    }
  }, [id]);

  const fetchPenjualan = async () => {
    try {
      const user = await getCurrentUser();
      if (!user) return;

      // First try with user_id filter
      let { data, error } = await supabase
        .from('penjualan')
        .select(`
          *,
          produk_jadi (
            id,
            nama_produk_jadi,
            sku,
            harga_jual
          )
        `)
        .eq('id', id)
        .eq('user_id', user.id)
        .single();

      // If not found with user_id, try without user_id filter (for sample data)
      if (error && error.code === 'PGRST116') {
        const { data: sampleData, error: sampleError } = await supabase
          .from('penjualan')
          .select(`
            *,
            produk_jadi (
              id,
              nama_produk_jadi,
              sku,
              harga_jual
            )
          `)
          .eq('id', id)
          .single();
        
        if (sampleError) throw sampleError;
        data = sampleData;
      } else if (error) {
        throw error;
      }
      
      setPenjualan(data as Penjualan);
    } catch (error) {
      console.error('Error fetching penjualan:', error);
      toast.error('Gagal memuat data penjualan');
      router.push('/dashboard/penjualan');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Apakah Anda yakin ingin menghapus penjualan ini?')) {
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
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) {
        throw error;
      }

      toast.success('Penjualan berhasil dihapus');
      router.push('/dashboard/penjualan');
    } catch (error) {
      console.error('Error deleting penjualan:', error);
      toast.error('Gagal menghapus penjualan');
    } finally {
      setDeleting(false);
    }
  };

  const handleEdit = () => {
    router.push(`/dashboard/penjualan/edit/${id}`);
  };

  const navbarActions = [
    createNavbarActions.edit(handleEdit),
    createNavbarActions.delete(handleDelete)
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900">
        <Navbar title="Detail Penjualan" showBackButton />
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

  if (!penjualan) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900">
        <Navbar title="Detail Penjualan" showBackButton />
        <div className="p-4 md:p-6">
          <div className="text-center py-12">
            <ShoppingCart className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Penjualan tidak ditemukan
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Data penjualan yang Anda cari tidak dapat ditemukan.
            </p>
            <button
              onClick={() => router.push('/dashboard/penjualan')}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Kembali ke Daftar Penjualan
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <Navbar
        title="Detail Penjualan"
        showBackButton
        actions={navbarActions}
      >
        <DateTimeDisplay />
      </Navbar>
      <div className="p-4 md:p-6">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
          {/* Informasi Produk */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                Informasi Produk
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Nama Produk
                </label>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {penjualan.produk_jadi.nama_produk_jadi}
                </p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  SKU
                </label>
                <p className="text-base text-gray-900 dark:text-white">
                  {penjualan.produk_jadi.sku}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Harga Jual
                </label>
                <p className="text-base text-gray-900 dark:text-white">
                  {formatCurrency(penjualan.produk_jadi.harga_jual)}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Informasi Penjualan */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5" />
                Detail Penjualan
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Jumlah Terjual
                </label>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {penjualan.jumlah.toLocaleString('id-ID')} unit
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Total Harga
                </label>
                <p className="text-xl font-bold text-green-600 dark:text-green-400">
                  {formatCurrency(penjualan.total_harga)}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Informasi Tanggal */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Informasi Tanggal
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Tanggal Penjualan
                </label>
                <p className="text-base text-gray-900 dark:text-white">
                  {formatDateTime(penjualan.tanggal)}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Tanggal Dibuat
                </label>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {formatDateTime(penjualan.created_at)}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Catatan */}
          {penjualan.catatan && (
            <Card className="shadow-lg md:col-span-2 xl:col-span-3">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  Catatan
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div>
                  <p className="text-base text-gray-900 dark:text-white whitespace-pre-wrap">
                    {penjualan.catatan}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Invoice Summary */}
          <Card className="shadow-sm border-l-4 border-l-green-500 md:col-span-2 xl:col-span-3">
            <CardContent className="p-6">
              <div className="space-y-4">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 pb-3">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    Ringkasan Penjualan
                  </h3>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    Invoice #{penjualan.id.slice(-8).toUpperCase()}
                  </div>
                </div>

                {/* Summary Items */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Jumlah Terjual
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-lg font-bold text-gray-900 dark:text-gray-100">
                        {penjualan.jumlah.toLocaleString('id-ID')}
                      </span>
                      <span className="text-sm text-gray-500 dark:text-gray-400 ml-1">
                        unit
                      </span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center py-2 border-t border-gray-100 dark:border-gray-800">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Harga per Unit
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                        {formatCurrency(penjualan.total_harga / penjualan.jumlah)}
                      </span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center py-3 border-t-2 border-gray-200 dark:border-gray-700 mt-4">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span className="text-base font-semibold text-gray-800 dark:text-gray-200">
                        Total Pendapatan
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-2xl font-bold text-green-600 dark:text-green-400">
                        {formatCurrency(penjualan.total_harga)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="border-t border-gray-200 dark:border-gray-700 pt-3 mt-4">
                  <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
                    Transaksi pada {new Date(penjualan.tanggal).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'long', 
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}