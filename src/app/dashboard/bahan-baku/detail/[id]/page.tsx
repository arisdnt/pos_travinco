'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Package, Edit, Trash2, Loader2, Calendar, DollarSign, Hash, User, Tag } from 'lucide-react';
import { supabase, getCurrentUser } from '@/lib/supabase';
import { toast } from 'sonner';
import { formatCurrency, formatDateTime } from '@/lib/utils';

interface BahanBaku {
  id: string;
  nama_bahan_baku: string;
  kategori: string;
  satuan: string;
  harga_per_unit: number;
  supplier: string;
  stok: number;
  created_at: string;
  updated_at: string;
}

const getCategoryLabel = (category: string) => {
  const labels: { [key: string]: string } = {
    essential_oil: 'Essential Oil',
    carrier_oil: 'Carrier Oil',
    alcohol: 'Alcohol',
    fixative: 'Fixative',
    packaging: 'Packaging',
    other: 'Lainnya'
  };
  return labels[category] || category;
};

const getCategoryColor = (category: string) => {
  const colors: { [key: string]: string } = {
    essential_oil: 'bg-purple-100 text-purple-800',
    carrier_oil: 'bg-green-100 text-green-800',
    alcohol: 'bg-blue-100 text-blue-800',
    fixative: 'bg-orange-100 text-orange-800',
    packaging: 'bg-gray-100 text-gray-800',
    other: 'bg-yellow-100 text-yellow-800'
  };
  return colors[category] || 'bg-gray-100 text-gray-800';
};

export default function DetailBahanBakuPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [bahanBaku, setBahanBaku] = useState<BahanBaku | null>(null);

  useEffect(() => {
    if (id) {
      fetchBahanBaku();
    }
  }, [id]);

  const fetchBahanBaku = async () => {
    try {
      const { data, error } = await supabase
        .from('bahan_baku')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      setBahanBaku(data);
    } catch (error: any) {
      console.error('Error fetching bahan baku:', error);
      toast.error('Gagal memuat data bahan baku');
      router.push('/dashboard/bahan-baku');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!bahanBaku) return;
    
    const confirmed = window.confirm(
      `Apakah Anda yakin ingin menghapus bahan baku "${bahanBaku.nama_bahan_baku}"?`
    );
    
    if (!confirmed) return;

    setDeleting(true);
    try {
      const user = await getCurrentUser();
      if (!user) {
        toast.error('Anda harus login terlebih dahulu');
        return;
      }

      const { error } = await supabase
        .from('bahan_baku')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      toast.success('Bahan baku berhasil dihapus!');
      router.push('/dashboard/bahan-baku');
    } catch (error: any) {
      console.error('Error deleting bahan baku:', error);
      toast.error(error.message || 'Gagal menghapus bahan baku');
    } finally {
      setDeleting(false);
    }
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

  if (!bahanBaku) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Package className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Bahan Baku Tidak Ditemukan
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Bahan baku yang Anda cari tidak ditemukan.
          </p>
          <Button onClick={() => router.push('/dashboard/bahan-baku')}>
            Kembali ke Daftar Bahan Baku
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
            <Package className="w-6 h-6 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Detail Bahan Baku
            </h1>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/dashboard/bahan-baku/edit/${id}`)}
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

      {/* Material Details */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Basic Information */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              Informasi Dasar
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Nama Bahan Baku
              </label>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {bahanBaku.nama_bahan_baku}
              </p>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1">
                <Tag className="w-4 h-4" />
                Kategori
              </label>
              <Badge className={`mt-1 ${getCategoryColor(bahanBaku.kategori)}`}>
                {getCategoryLabel(bahanBaku.kategori)}
              </Badge>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Satuan
              </label>
              <p className="text-gray-900 dark:text-white font-mono">
                {bahanBaku.satuan}
              </p>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1">
                <DollarSign className="w-4 h-4" />
                Harga per Unit
              </label>
              <p className="text-lg font-semibold text-green-600 dark:text-green-400">
                {formatCurrency(bahanBaku.harga_per_unit)}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Stock & Supplier */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              Stok & Supplier
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Stok Tersedia
              </label>
              <div className="flex items-center gap-2">
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {bahanBaku.stok} {bahanBaku.satuan}
                </p>
                <Badge 
                  variant={bahanBaku.stok > 0 ? "default" : "destructive"}
                  className="ml-2"
                >
                  {bahanBaku.stok > 0 ? 'Tersedia' : 'Habis'}
                </Badge>
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1">
                <User className="w-4 h-4" />
                Supplier
              </label>
              <p className="text-gray-900 dark:text-white font-medium">
                {bahanBaku.supplier}
              </p>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Nilai Stok
              </label>
              <p className="text-lg font-semibold text-blue-600 dark:text-blue-400">
                {formatCurrency(bahanBaku.stok * bahanBaku.harga_per_unit)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Timestamps */}
      <Card className="shadow-lg mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Informasi Waktu
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Dibuat Pada
              </label>
              <p className="text-gray-900 dark:text-white">
                {formatDateTime(bahanBaku.created_at)}
              </p>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Terakhir Diperbarui
              </label>
              <p className="text-gray-900 dark:text-white">
                {formatDateTime(bahanBaku.updated_at)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}