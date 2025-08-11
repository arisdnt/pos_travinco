'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Package, Edit, Trash2, Loader2, Calendar, DollarSign, Hash } from 'lucide-react';
import { supabase, getCurrentUser } from '@/lib/supabase';
import { toast } from 'sonner';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { Navbar } from '@/components/layout/navbar';

interface ProdukJadi {
  id: string;
  nama_produk_jadi: string;
  sku: string;
  harga_jual: number;
  stok: number;
  created_at: string;
  updated_at: string;
}

export default function DetailProdukJadiPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [produkJadi, setProdukJadi] = useState<ProdukJadi | null>(null);

  useEffect(() => {
    if (id) {
      fetchProdukJadi();
    }
  }, [id]);

  const fetchProdukJadi = async () => {
    try {
      const { data, error } = await supabase
        .from('produk_jadi')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      setProdukJadi(data);
    } catch (error: any) {
      console.error('Error fetching produk jadi:', error);
      toast.error('Gagal memuat data produk jadi');
      router.push('/dashboard/produk-jadi');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!produkJadi) return;
    
    const confirmed = window.confirm(
      `Apakah Anda yakin ingin menghapus produk "${produkJadi.nama_produk_jadi}"?`
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
        .from('produk_jadi')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      toast.success('Produk jadi berhasil dihapus!');
      router.push('/dashboard/produk-jadi');
    } catch (error: any) {
      console.error('Error deleting produk jadi:', error);
      toast.error(error.message || 'Gagal menghapus produk jadi');
    } finally {
      setDeleting(false);
    }
  };

  // Navbar actions
  const navbarActions = [
    {
      label: 'Edit',
      onClick: () => router.push(`/dashboard/produk-jadi/edit/${id}`),
      icon: Edit,
      variant: 'outline' as const
    },
    {
      label: 'Hapus',
      onClick: handleDelete,
      icon: Trash2,
      variant: 'destructive' as const,
      disabled: deleting
    }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Navbar 
          title="Detail Produk Jadi" 
          showBackButton={true}
        />
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="flex items-center gap-2">
            <Loader2 className="w-6 h-6 animate-spin" />
            <span>Memuat data...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!produkJadi) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Navbar 
          title="Detail Produk Jadi" 
          showBackButton={true}
        />
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="text-center">
            <Package className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Produk Tidak Ditemukan
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Produk jadi yang Anda cari tidak ditemukan.
            </p>
            <Button onClick={() => router.push('/dashboard/produk-jadi')}>
              Kembali ke Daftar Produk
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar 
        title={`Detail - ${produkJadi.nama_produk_jadi}`} 
        showBackButton={true}
        actions={navbarActions}
      />
      
      <div className="p-4 md:p-6">

      {/* Product Details */}
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
                Nama Produk
              </label>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {produkJadi.nama_produk_jadi}
              </p>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1">
                <Hash className="w-4 h-4" />
                SKU
              </label>
              <p className="text-gray-900 dark:text-white font-mono">
                {produkJadi.sku}
              </p>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1">
                <DollarSign className="w-4 h-4" />
                Harga Jual
              </label>
              <p className="text-lg font-semibold text-green-600 dark:text-green-400">
                {formatCurrency(produkJadi.harga_jual)}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Stock & Status */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              Stok & Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Stok Tersedia
              </label>
              <div className="flex items-center gap-2">
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {produkJadi.stok}
                </p>
                <Badge 
                  variant={produkJadi.stok > 0 ? "default" : "destructive"}
                  className="ml-2"
                >
                  {produkJadi.stok > 0 ? 'Tersedia' : 'Habis'}
                </Badge>
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Status Produk
              </label>
              <Badge variant="default" className="mt-1">
                Aktif
              </Badge>
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
                {formatDateTime(produkJadi.created_at)}
              </p>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Terakhir Diperbarui
              </label>
              <p className="text-gray-900 dark:text-white">
                {formatDateTime(produkJadi.updated_at)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
      </div>
    </div>
  );
}