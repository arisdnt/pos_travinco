'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Edit, ShoppingCart, Calendar, User, Package, DollarSign } from 'lucide-react';
import { supabase, getCurrentUser } from '@/lib/supabase';
import { toast } from 'sonner';
import { formatCurrency, formatDateTime } from '@/lib/utils';

interface Pembelian {
  id: string;
  jumlah: number;
  harga_per_unit: number;
  total_harga: number;
  supplier: string;
  tanggal_pembelian: string;
  created_at: string;
  bahan_baku: {
    id: string;
    nama_bahan_baku: string;
    satuan: string;
    kategori: string;
  };
}

export default function DetailPembelianPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const [loading, setLoading] = useState(true);
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

      const { data, error } = await supabase
        .from('pembelian')
        .select(`
          *,
          bahan_baku (
            id,
            nama_bahan_baku,
            satuan,
            kategori
          )
        `)
        .eq('id', id)
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      setPembelian(data as Pembelian);
    } catch (error) {
      console.error('Error fetching pembelian:', error);
      toast.error('Gagal memuat data pembelian');
      router.push('/dashboard/pembelian');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    router.push(`/dashboard/pembelian/edit/${id}`);
  };

  if (loading) {
    return (
      <div className="p-4 mx-auto max-w-4xl md:p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Memuat data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!pembelian) {
    return (
      <div className="p-4 mx-auto max-w-4xl md:p-6">
        <div className="text-center py-12">
          <ShoppingCart className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Pembelian tidak ditemukan
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Data pembelian yang Anda cari tidak dapat ditemukan.
          </p>
          <Button onClick={() => router.push('/dashboard/pembelian')}>
            Kembali ke Daftar Pembelian
          </Button>
        </div>
      </div>
    );
  }

  const getCategoryColor = (category: string) => {
    const colors: { [key: string]: string } = {
      'essential_oil': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      'carrier_oil': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      'alcohol': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      'fixative': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      'packaging': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      'other': 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    };
    return colors[category] || colors['other'];
  };

  const getCategoryLabel = (category: string) => {
    const labels: { [key: string]: string } = {
      'essential_oil': 'Essential Oil',
      'carrier_oil': 'Carrier Oil',
      'alcohol': 'Alcohol',
      'fixative': 'Fixative',
      'packaging': 'Packaging',
      'other': 'Lainnya'
    };
    return labels[category] || 'Lainnya';
  };

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
              Detail Pembelian
            </h1>
          </div>
        </div>
        <Button
          onClick={handleEdit}
          className="flex items-center gap-2"
        >
          <Edit className="w-4 h-4" />
          Edit Pembelian
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
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
                Kategori
              </label>
              <div className="mt-1">
                <Badge className={getCategoryColor(pembelian.bahan_baku.kategori)}>
                  {getCategoryLabel(pembelian.bahan_baku.kategori)}
                </Badge>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Satuan
              </label>
              <p className="text-base text-gray-900 dark:text-white">
                {pembelian.bahan_baku.satuan}
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
                {pembelian.jumlah.toLocaleString('id-ID')} {pembelian.bahan_baku.satuan}
              </p>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Harga per Unit
              </label>
              <p className="text-base text-gray-900 dark:text-white">
                {formatCurrency(pembelian.harga_per_unit)}
              </p>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Total Harga
              </label>
              <p className="text-xl font-bold text-green-600 dark:text-green-400">
                {formatCurrency(pembelian.total_harga)}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Informasi Supplier */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Informasi Supplier
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div>
              <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Nama Supplier
              </label>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {pembelian.supplier}
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
                {formatDateTime(pembelian.tanggal_pembelian)}
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
      </div>

      {/* Summary Card */}
      <Card className="shadow-lg mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Ringkasan Pembelian
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p className="text-sm font-medium text-blue-600 dark:text-blue-400">
                Jumlah Dibeli
              </p>
              <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                {pembelian.jumlah.toLocaleString('id-ID')}
              </p>
              <p className="text-sm text-blue-600 dark:text-blue-400">
                {pembelian.bahan_baku.satuan}
              </p>
            </div>
            
            <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <p className="text-sm font-medium text-green-600 dark:text-green-400">
                Harga per Unit
              </p>
              <p className="text-2xl font-bold text-green-700 dark:text-green-300">
                {formatCurrency(pembelian.harga_per_unit)}
              </p>
            </div>
            
            <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <p className="text-sm font-medium text-purple-600 dark:text-purple-400">
                Total Investasi
              </p>
              <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">
                {formatCurrency(pembelian.total_harga)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}