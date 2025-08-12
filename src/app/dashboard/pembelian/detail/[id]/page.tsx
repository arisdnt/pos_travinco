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

interface Pembelian {
  id: string;
  jumlah: number;
  harga_beli: number;
  tanggal: string;
  catatan: string;
  created_at: string;
  bahan_baku: {
    id: string;
    nama_bahan_baku: string;
    unit: string;
  };
}

export default function DetailPembelianPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [pembelian, setPembelian] = useState<Pembelian | null>(null);

  useEffect(() => {
    if (id) {
      fetchPembelian();
    }
  }, [id]);

  const fetchPembelian = async () => {
    try {
      const user = await getCurrentUser();
      if (!user) return;

      // First try with user_id filter
      let { data, error } = await supabase
        .from('pembelian')
        .select(`
          *,
          bahan_baku (
            id,
            nama_bahan_baku,
            unit
          )
        `)
        .eq('id', id)
        .eq('user_id', user.id)
        .single();

      // If not found with user_id, try without user_id filter (for sample data)
      if (error && error.code === 'PGRST116') {
        const { data: sampleData, error: sampleError } = await supabase
          .from('pembelian')
          .select(`
            *,
            bahan_baku (
              id,
              nama_bahan_baku,
              unit
            )
          `)
          .eq('id', id)
          .single();
        
        if (sampleError) throw sampleError;
        data = sampleData;
      } else if (error) {
        throw error;
      }
      
      setPembelian(data as Pembelian);
    } catch (error) {
      console.error('Error fetching pembelian:', error);
      toast.error('Gagal memuat data pembelian');
      router.push('/dashboard/pembelian');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Apakah Anda yakin ingin menghapus pembelian ini?')) {
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
        .from('pembelian')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) {
        throw error;
      }

      toast.success('Pembelian berhasil dihapus');
      router.push('/dashboard/pembelian');
    } catch (error) {
      console.error('Error deleting pembelian:', error);
      toast.error('Gagal menghapus pembelian');
    } finally {
      setDeleting(false);
    }
  };

  const handleEdit = () => {
    router.push(`/dashboard/pembelian/edit/${id}`);
  };

  const navbarActions = [
    createNavbarActions.edit(handleEdit),
    createNavbarActions.delete(handleDelete)
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Navbar title="Detail Pembelian" showBackButton />
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

  if (!pembelian) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Navbar title="Detail Pembelian" showBackButton />
        <div className="p-4 md:p-6">
          <div className="text-center py-12">
            <ShoppingCart className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Pembelian tidak ditemukan
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Data pembelian yang Anda cari tidak dapat ditemukan.
            </p>
            <button
              onClick={() => router.push('/dashboard/pembelian')}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Kembali ke Daftar Pembelian
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar
        title="Detail Pembelian"
        showBackButton
        actions={navbarActions}
      />
      <div className="p-4 md:p-6">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
          {/* Informasi Bahan Baku */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                Informasi Bahan Baku
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Nama Bahan Baku
                </label>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {pembelian.bahan_baku.nama_bahan_baku}
                </p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Satuan
                </label>
                <p className="text-base text-gray-900 dark:text-white">
                  {pembelian.bahan_baku.unit}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Informasi Pembelian */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5" />
                Detail Pembelian
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Jumlah
                </label>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {pembelian.jumlah.toLocaleString('id-ID')} {pembelian.bahan_baku.unit}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Harga Beli
                </label>
                <p className="text-xl font-bold text-green-600 dark:text-green-400">
                  {formatCurrency(pembelian.harga_beli)}
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
                  Tanggal Pembelian
                </label>
                <p className="text-base text-gray-900 dark:text-white">
                  {formatDateTime(pembelian.tanggal)}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Tanggal Dibuat
                </label>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {formatDateTime(pembelian.created_at)}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Catatan */}
          {pembelian.catatan && (
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
                    {pembelian.catatan}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Invoice Summary */}
          <Card className="shadow-sm border-l-4 border-l-blue-500 md:col-span-2 xl:col-span-3">
            <CardContent className="p-6">
              <div className="space-y-4">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 pb-3">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    Ringkasan Pembelian
                  </h3>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    Invoice #{pembelian.id.slice(-8).toUpperCase()}
                  </div>
                </div>

                {/* Summary Items */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Jumlah Dibeli
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-lg font-bold text-gray-900 dark:text-gray-100">
                        {pembelian.jumlah.toLocaleString('id-ID')}
                      </span>
                      <span className="text-sm text-gray-500 dark:text-gray-400 ml-1">
                        {pembelian.bahan_baku.unit}
                      </span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center py-2 border-t border-gray-100 dark:border-gray-800">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Total Harga Beli
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-xl font-bold text-green-600 dark:text-green-400">
                        {formatCurrency(pembelian.harga_beli)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="border-t border-gray-200 dark:border-gray-700 pt-3 mt-4">
                  <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
                    Transaksi pada {new Date(pembelian.tanggal).toLocaleDateString('id-ID', {
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