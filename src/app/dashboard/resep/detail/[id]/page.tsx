'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChefHat, Package, Calculator, AlertTriangle, Edit, Trash2, Loader2 } from 'lucide-react';
import { Navbar } from '@/components/layout/navbar';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { supabase, getCurrentUser } from '@/lib/supabase';
import { toast } from 'sonner';
import { formatNumber, formatCurrency } from '@/lib/utils';

interface ResepDetail {
  id: string;
  produk_jadi_id: string;
  bahan_baku_id: string;
  jumlah_dibutuhkan: number;
  produk_jadi: {
    id: string;
    nama_produk_jadi: string;
    sku: string;
    harga_jual: number;
  };
  bahan_baku: {
    id: string;
    nama_bahan_baku: string;
    stok: number;
    unit_dasar?: {
      nama_unit: string;
    };
  };
}

export default function DetailResepPage() {
  const router = useRouter();
  const params = useParams();
  const produkJadiId = params.id as string;
  const [loading, setLoading] = useState(true);
  const [resepData, setResepData] = useState<ResepDetail[]>([]);
  const [maxProduksi, setMaxProduksi] = useState<number>(0);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; loading: boolean }>(
    { open: false, loading: false }
  );

  useEffect(() => {
    if (produkJadiId) {
      fetchResep();
    }
  }, [produkJadiId]);

  const fetchResep = async () => {
    try {
      const user = await getCurrentUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('resep')
        .select(`
          *,
          produk_jadi (
            id,
            nama_produk_jadi,
            sku,
            harga_jual
          ),
          bahan_baku (
            id,
            nama_bahan_baku,
            stok,
            unit_dasar:unit_dasar_id(nama_unit)
          )
        `)
        .eq('produk_jadi_id', produkJadiId)
        .eq('user_id', user.id)
        .order('bahan_baku(nama_bahan_baku)');

      if (error) throw error;
      
      if (!data || data.length === 0) {
        toast.error('Resep tidak ditemukan');
        router.push('/dashboard/resep');
        return;
      }

      const resepDetail = data as ResepDetail[];
      setResepData(resepDetail);
      
      // Calculate maximum production
      let minProduksi = Infinity;
      resepDetail.forEach(item => {
        const maxFromThisIngredient = Math.floor(item.bahan_baku.stok / item.jumlah_dibutuhkan);
        if (maxFromThisIngredient < minProduksi) {
          minProduksi = maxFromThisIngredient;
        }
      });
      setMaxProduksi(minProduksi === Infinity ? 0 : minProduksi);
    } catch (error) {
      console.error('Error fetching resep:', error);
      toast.error('Gagal memuat data resep');
      router.push('/dashboard/resep');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    router.push(`/dashboard/resep/edit/${produkJadiId}`);
  };

  const handleDelete = () => {
    setDeleteDialog({ open: true, loading: false });
  };

  const handleConfirmDelete = async () => {
    setDeleteDialog(prev => ({ ...prev, loading: true }));
    try {
      const { error } = await supabase
        .from('resep')
        .delete()
        .eq('produk_jadi_id', produkJadiId);

      if (error) throw error;

      toast.success('Resep berhasil dihapus!');
      router.push('/dashboard/resep');
    } catch (error: any) {
      console.error('Error deleting resep:', error);
      toast.error(error.message || 'Gagal menghapus resep');
    } finally {
      setDeleteDialog(prev => ({ ...prev, loading: false, open: false }));
    }
  };

  const navbarActions = [
    {
      label: "Edit",
      onClick: handleEdit,
      icon: Edit,
      variant: "default" as const
    },
    {
      label: "Hapus",
      onClick: handleDelete,
      icon: Trash2,
      variant: "destructive" as const
    }
  ];

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

  if (resepData.length === 0) {
    return (
      <div className="flex flex-col h-full">
        <Navbar 
          title="Detail Resep" 
          showBackButton={true}
          backUrl="/dashboard/resep"
        />
        <div className="flex-1 p-4 md:p-6 flex items-center justify-center">
          <div className="text-center">
            <ChefHat className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Resep tidak ditemukan
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Data resep yang Anda cari tidak dapat ditemukan.
            </p>
            <Button onClick={() => router.push('/dashboard/resep')}>
              Kembali ke Daftar Resep
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const produkJadi = resepData[0].produk_jadi;
  
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

  const getStokStatus = (stok: number, dibutuhkan: number) => {
    const ratio = stok / dibutuhkan;
    if (ratio >= 10) return { color: 'text-green-600 dark:text-green-400', label: 'Aman' };
    if (ratio >= 5) return { color: 'text-yellow-600 dark:text-yellow-400', label: 'Cukup' };
    if (ratio >= 1) return { color: 'text-orange-600 dark:text-orange-400', label: 'Terbatas' };
    return { color: 'text-red-600 dark:text-red-400', label: 'Kurang' };
  };

  return (
    <div className="flex flex-col h-full">
      <Navbar 
        title={`Detail Resep - ${produkJadi.nama_produk_jadi}`}
        showBackButton={true}
        backUrl="/dashboard/resep"
        actions={navbarActions}
      />
      <div className="flex-1 p-4 md:p-6 space-y-6">

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Informasi Produk */}
        <div className="lg:col-span-1">
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
                  {produkJadi.nama_produk_jadi}
                </p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  SKU
                </label>
                <p className="text-base text-gray-900 dark:text-white font-mono">
                  {produkJadi.sku}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Harga Jual
                </label>
                <p className="text-lg font-semibold text-green-600 dark:text-green-400">
                  Rp {formatNumber(produkJadi.harga_jual)}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Harga Jual
                </label>
                <p className="text-base text-gray-900 dark:text-white">
                  {formatCurrency(produkJadi.harga_jual)}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Analisis Produksi */}
          <Card className="shadow-lg mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="w-5 h-5" />
                Analisis Produksi
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <p className="text-sm font-medium text-blue-600 dark:text-blue-400">
                  Maksimal Produksi
                </p>
                <p className="text-3xl font-bold text-blue-700 dark:text-blue-300">
                  {formatNumber(maxProduksi)}
                </p>
                <p className="text-sm text-blue-600 dark:text-blue-400">
                  unit produk
                </p>
              </div>
              
              {maxProduksi === 0 && (
                <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
                  <p className="text-sm text-red-700 dark:text-red-300">
                    Tidak dapat memproduksi karena stok bahan baku tidak mencukupi
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Daftar Bahan Baku */}
        <div className="lg:col-span-2">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                Bahan Baku Resep ({resepData.length} item)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {resepData.map((item, index) => {
                  const stokStatus = getStokStatus(item.bahan_baku.stok, item.jumlah_dibutuhkan);
                  const maxProduksiItem = Math.floor(item.bahan_baku.stok / item.jumlah_dibutuhkan);
                  
                  return (
                    <Card key={item.id} className="p-4 border-l-4 border-l-blue-500">
                      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-gray-900 dark:text-white">
                              {item.bahan_baku.nama_bahan_baku}
                            </h3>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Satuan: {item.bahan_baku.unit_dasar?.nama_unit || '-'}
                          </p>
                        </div>

                        <div className="space-y-2">
                          <div>
                            <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
                              Dibutuhkan per Unit
                            </label>
                            <p className="text-sm font-semibold text-gray-900 dark:text-white">
                              {formatNumber(item.jumlah_dibutuhkan)} {item.bahan_baku.unit_dasar?.nama_unit || '-'}
                            </p>
                          </div>
                          <div>
                            <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
                              Stok Tersedia
                            </label>
                            <p className={`text-sm font-semibold ${stokStatus.color}`}>
                              {formatNumber(item.bahan_baku.stok)} {item.bahan_baku.unit_dasar?.nama_unit || '-'}
                            </p>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div>
                            <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
                              Status Stok
                            </label>
                            <p className={`text-sm font-semibold ${stokStatus.color}`}>
                              {stokStatus.label}
                            </p>
                          </div>
                          <div>
                            <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
                              Maks. Produksi
                            </label>
                            <p className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                              {formatNumber(maxProduksiItem)} unit
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      {/* Progress Bar */}
                      <div className="mt-3">
                        <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
                          <span>Penggunaan Stok</span>
                          <span>
                            {((item.jumlah_dibutuhkan / item.bahan_baku.stok) * 100).toFixed(1)}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${
                              maxProduksiItem >= 10 ? 'bg-green-500' :
                              maxProduksiItem >= 5 ? 'bg-yellow-500' :
                              maxProduksiItem >= 1 ? 'bg-orange-500' : 'bg-red-500'
                            }`}
                            style={{ 
                              width: `${Math.min((item.jumlah_dibutuhkan / item.bahan_baku.stok) * 100, 100)}%` 
                            }}
                          ></div>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog(prev => ({ ...prev, open }))}
        title="Hapus Resep"
        description={`Apakah Anda yakin ingin menghapus seluruh resep untuk produk ini? Tindakan ini tidak dapat dibatalkan.`}
        confirmText="Hapus"
        cancelText="Batal"
        variant="destructive"
        onConfirm={handleConfirmDelete}
        loading={deleteDialog.loading}
      />
      {/* Summary Statistics */}
      <Card className="shadow-lg mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="w-5 h-5" />
            Ringkasan Resep
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p className="text-sm font-medium text-blue-600 dark:text-blue-400">
                Total Bahan
              </p>
              <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                {resepData.length}
              </p>
              <p className="text-sm text-blue-600 dark:text-blue-400">
                jenis bahan
              </p>
            </div>
            
            <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <p className="text-sm font-medium text-green-600 dark:text-green-400">
                Bahan Aman
              </p>
              <p className="text-2xl font-bold text-green-700 dark:text-green-300">
                {resepData.filter(item => 
                  Math.floor(item.bahan_baku.stok / item.jumlah_dibutuhkan) >= 10
                ).length}
              </p>
              <p className="text-sm text-green-600 dark:text-green-400">
                bahan
              </p>
            </div>
            
            <div className="text-center p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <p className="text-sm font-medium text-yellow-600 dark:text-yellow-400">
                Bahan Terbatas
              </p>
              <p className="text-2xl font-bold text-yellow-700 dark:text-yellow-300">
                {resepData.filter(item => {
                  const max = Math.floor(item.bahan_baku.stok / item.jumlah_dibutuhkan);
                  return max >= 1 && max < 10;
                }).length}
              </p>
              <p className="text-sm text-yellow-600 dark:text-yellow-400">
                bahan
              </p>
            </div>
            
            <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
              <p className="text-sm font-medium text-red-600 dark:text-red-400">
                Bahan Kurang
              </p>
              <p className="text-2xl font-bold text-red-700 dark:text-red-300">
                {resepData.filter(item => 
                  Math.floor(item.bahan_baku.stok / item.jumlah_dibutuhkan) < 1
                ).length}
              </p>
              <p className="text-sm text-red-600 dark:text-red-400">
                bahan
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
      </div>
    </div>
  );
}
