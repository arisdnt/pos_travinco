'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Navbar } from '@/components/layout/navbar';
import { 
  ArrowLeft, 
  Edit, 
  Trash2, 
  Package, 
  Building2, 
  Calendar, 
  User, 
  FileText,
  AlertCircle,
  Loader2,
  CheckCircle
} from 'lucide-react';
import { toast } from 'sonner';
import type { ReservasiStokSupplier } from '@/types/master-data';

export default function DetailReservasiStokPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  
  const [loading, setLoading] = useState(true);
  const [reservasiStok, setReservasiStok] = useState<ReservasiStokSupplier | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchReservasiStok = async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('reservasi_stok_supplier')
      .select(`
        *,
        bahan_baku (
          id,
          nama_bahan_baku,
          stok,
          unit_dasar (
            nama_unit
          ),
          kategori (
            nama_kategori
          )
        ),
        suppliers (
          id,
          nama_supplier,
          kontak,
          alamat
        ),
        kemasan (
          id,
          nama_kemasan,
          nilai_konversi
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching reservasi stok:', error);
      toast.error('Gagal memuat data reservasi stok');
    } else {
      setReservasiStok(data);
    }
    setLoading(false);
  };

  const handleDelete = async () => {
    if (!reservasiStok) return;
    
    const confirmed = window.confirm(
      `Apakah Anda yakin ingin menghapus reservasi stok untuk bahan baku "${reservasiStok.bahan_baku?.nama_bahan_baku}" dari supplier "${reservasiStok.suppliers?.nama_supplier}"?\n\nTindakan ini tidak dapat dibatalkan.`
    );
    
    if (!confirmed) return;

    try {
      setDeleteLoading(true);
      const supabase = createClient();
      
      const { error } = await supabase
        .from('reservasi_stok_supplier')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting reservasi stok:', error);
        toast.error('Gagal menghapus reservasi stok');
      } else {
        toast.success('Reservasi stok berhasil dihapus');
        router.push('/dashboard/master-data/reservasi-stok');
      }
    } catch (error) {
      console.error('Error in handleDelete:', error);
      toast.error('Terjadi kesalahan saat menghapus data');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleEdit = () => {
    router.push(`/dashboard/master-data/reservasi-stok/${id}/edit`);
  };

  const handleBack = () => {
    router.push('/dashboard/master-data/reservasi-stok');
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  useEffect(() => {
    if (id) {
      fetchReservasiStok();
    }
  }, [id]);

  if (loading) {
    return (
      <div className="flex h-full flex-col">
        <Navbar
          title="Detail Reservasi Stok"
          actions={[
            {
              label: 'Kembali',
              onClick: handleBack,
              icon: ArrowLeft,
              variant: 'outline'
            }
          ]}
        />
        
        <div className="flex-1 p-4 md:p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="shadow-lg border-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-center h-64">
                  <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
                    <p className="text-gray-600 dark:text-gray-400">Memuat data reservasi stok...</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (!reservasiStok) {
    return (
      <div className="flex h-full flex-col">
        <Navbar
          title="Detail Reservasi Stok"
          actions={[
            {
              label: 'Kembali',
              onClick: handleBack,
              icon: ArrowLeft,
              variant: 'outline'
            }
          ]}
        />
        
        <div className="flex-1 p-4 md:p-6">
          <Card className="shadow-lg border-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="text-center py-12">
                <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Reservasi Stok Tidak Ditemukan
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Reservasi stok yang Anda cari tidak ditemukan atau telah dihapus.
                </p>
                <Button onClick={handleBack}>
                  Kembali ke Daftar Reservasi
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <Navbar
        title="Detail Reservasi Stok"
        actions={[
          {
            label: 'Edit',
            onClick: handleEdit,
            icon: Edit,
            variant: 'default'
          },
          {
            label: deleteLoading ? 'Menghapus...' : 'Hapus',
            onClick: handleDelete,
            icon: Trash2,
            variant: 'destructive'
          },
          {
            label: 'Kembali',
            onClick: handleBack,
            icon: ArrowLeft,
            variant: 'outline'
          }
        ]}
      />
      
      <div className="flex-1 p-4 md:p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Main Information */}
          <Card className="shadow-lg border-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <Package className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Informasi Reservasi Stok
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Detail lengkap reservasi stok supplier
                  </p>
                </div>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      ID Reservasi
                    </label>
                    <p className="text-sm font-mono bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                      {reservasiStok.id}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Jumlah Reservasi
                    </label>
                    {reservasiStok.kemasan ? (
                      <div>
                        <p className="text-lg font-semibold text-blue-600 dark:text-blue-400">
                          {(reservasiStok.jumlah_reservasi / reservasiStok.kemasan.nilai_konversi).toLocaleString('id-ID')} {reservasiStok.kemasan.nama_kemasan}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          ({reservasiStok.jumlah_reservasi.toLocaleString('id-ID')} {reservasiStok.bahan_baku?.unit_dasar?.nama_unit || 'unit'})
                        </p>
                      </div>
                    ) : (
                      <p className="text-lg font-semibold text-blue-600 dark:text-blue-400">
                        {reservasiStok.jumlah_reservasi.toLocaleString('id-ID')} {reservasiStok.bahan_baku?.unit_dasar?.nama_unit || 'unit'}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Kemasan
                    </label>
                    {reservasiStok.kemasan ? (
                      <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                            <Package className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900 dark:text-white">
                              {reservasiStok.kemasan.nama_kemasan}
                            </h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              1 {reservasiStok.kemasan.nama_kemasan} = {reservasiStok.kemasan.nilai_konversi} {reservasiStok.bahan_baku?.unit_dasar?.nama_unit || 'unit'}
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                        <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                          Menggunakan satuan dasar ({reservasiStok.bahan_baku?.unit_dasar?.nama_unit || 'unit'})
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Bahan Baku
                  </label>
                  <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                        <Package className="h-4 w-4 text-green-600 dark:text-green-400" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900 dark:text-white">
                          {reservasiStok.bahan_baku?.nama_bahan_baku}
                        </h4>
                        <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                          <span>Kategori: {reservasiStok.bahan_baku?.kategori?.nama_kategori || 'Tanpa kategori'}</span>
                          <span>Stok: {reservasiStok.bahan_baku?.stok.toLocaleString('id-ID')}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Supplier
                  </label>
                  <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                        <Building2 className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900 dark:text-white">
                          {reservasiStok.suppliers?.nama_supplier}
                        </h4>
                        <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                          {reservasiStok.suppliers?.kontak && (
                            <p>Kontak: {reservasiStok.suppliers.kontak}</p>
                          )}
                          {reservasiStok.suppliers?.alamat && (
                            <p>Alamat: {reservasiStok.suppliers.alamat}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {reservasiStok.catatan && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Catatan
                    </label>
                    <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                      <div className="flex items-start gap-3">
                        <FileText className="h-4 w-4 text-gray-500 dark:text-gray-400 mt-0.5" />
                        <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                          {reservasiStok.catatan}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Additional Information */}
          <div className="space-y-6">
            <Card className="shadow-lg border-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                    <Calendar className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">Informasi Waktu</h3>
                </div>
                <div className="space-y-4">
                  <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Dibuat pada</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {formatDate(reservasiStok.created_at)}
                    </span>
                  </div>
                  {reservasiStok.updated_at && reservasiStok.updated_at !== reservasiStok.created_at && (
                    <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Terakhir diperbarui</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {formatDate(reservasiStok.updated_at)}
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-lg border-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                    <CheckCircle className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">Ringkasan Reservasi</h3>
                </div>
                <div className="space-y-4">
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                        Total Reservasi
                      </span>
                      <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                        {reservasiStok.jumlah_reservasi.toLocaleString('id-ID')} unit
                      </span>
                    </div>
                    <p className="text-xs text-blue-700 dark:text-blue-300">
                      Jumlah bahan baku yang direservasi dari supplier
                    </p>
                  </div>
                  
                  {reservasiStok.bahan_baku && (
                    <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-green-900 dark:text-green-100">
                          Stok Tersedia
                        </span>
                        <span className="text-lg font-bold text-green-600 dark:text-green-400">
                          {reservasiStok.bahan_baku.stok.toLocaleString('id-ID')} unit
                        </span>
                      </div>
                      <p className="text-xs text-green-700 dark:text-green-300">
                        Stok bahan baku yang tersedia saat ini
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-lg border-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                    <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">Tips Pengelolaan</h3>
                </div>
                <div className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
                  <div className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                    <p>Monitor stok bahan baku secara berkala untuk memastikan ketersediaan</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                    <p>Koordinasi dengan supplier untuk memastikan pengiriman tepat waktu</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 bg-orange-500 rounded-full mt-2 flex-shrink-0"></div>
                    <p>Update catatan reservasi jika ada perubahan kebutuhan</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 bg-purple-500 rounded-full mt-2 flex-shrink-0"></div>
                    <p>Pastikan jumlah reservasi sesuai dengan kapasitas penyimpanan</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}