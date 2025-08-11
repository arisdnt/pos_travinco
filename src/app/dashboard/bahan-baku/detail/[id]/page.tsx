'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Package, Edit, Trash2, Loader2, Calendar } from 'lucide-react';
import { supabase, getCurrentUser } from '@/lib/supabase';
import { toast } from 'sonner';
import { formatDateTime } from '@/lib/utils';
import { Navbar } from '@/components/layout/navbar';

interface BahanBaku {
  id: string;
  nama_bahan_baku: string;
  stok: number;
  unit: string;
  created_at: string;
  updated_at: string;
}



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

  const navbarActions = [
    {
      label: "Edit",
      onClick: () => router.push(`/dashboard/bahan-baku/edit/${id}`),
      icon: Edit,
      variant: "outline" as const
    },
    {
      label: deleting ? "Menghapus..." : "Hapus",
      onClick: handleDelete,
      icon: Trash2,
      variant: "destructive" as const,
      disabled: deleting
    }
  ];

  return (
    <div className="flex flex-col h-full">
      <Navbar 
        title="Detail Bahan Baku" 
        showBackButton={true}
        backUrl="/dashboard/bahan-baku"
        actions={navbarActions}
      />

      <div className="flex-1 p-4 md:p-6 space-y-6 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-blue-900 dark:to-indigo-900">

        {/* Material Details */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Basic Information */}
          <Card className="w-full overflow-hidden rounded-2xl border border-gray-200 bg-white px-4 pb-3 pt-4 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6 shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl font-semibold text-gray-900 dark:text-white">
                <Package className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                Informasi Dasar
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Nama Bahan Baku
                </label>
                <p className="text-lg font-semibold text-gray-900 dark:text-white mt-1">
                  {bahanBaku.nama_bahan_baku}
                </p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Unit/Satuan
                </label>
                <p className="text-gray-900 dark:text-white font-mono mt-1 text-lg">
                  {bahanBaku.unit}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Stock Information */}
          <Card className="w-full overflow-hidden rounded-2xl border border-gray-200 bg-white px-4 pb-3 pt-4 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6 shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl font-semibold text-gray-900 dark:text-white">
                <Package className="w-6 h-6 text-green-600 dark:text-green-400" />
                Informasi Stok
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Stok Tersedia
                </label>
                <div className="flex items-center gap-3 mt-2">
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">
                    {bahanBaku.stok}
                  </p>
                  <div className="flex flex-col">
                    <span className="text-sm text-gray-500 dark:text-gray-400">{bahanBaku.unit}</span>
                    <Badge 
                      variant={bahanBaku.stok > 0 ? "default" : "destructive"}
                      className="w-fit"
                    >
                      {bahanBaku.stok > 0 ? 'Tersedia' : 'Habis'}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Timestamps */}
        <Card className="w-full overflow-hidden rounded-2xl border border-gray-200 bg-white px-4 pb-3 pt-4 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6 shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl font-semibold text-gray-900 dark:text-white">
              <Calendar className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              Informasi Waktu
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Dibuat Pada
                </label>
                <p className="text-gray-900 dark:text-white mt-1 font-medium">
                  {formatDateTime(bahanBaku.created_at)}
                </p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Terakhir Diperbarui
                </label>
                <p className="text-gray-900 dark:text-white mt-1 font-medium">
                  {formatDateTime(bahanBaku.updated_at)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}