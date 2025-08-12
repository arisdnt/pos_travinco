'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Edit, Trash2, Calendar, User, Building2, Phone, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { Navbar } from '@/components/layout/navbar';

interface Supplier {
  id: string;
  nama_supplier: string;
  kontak: string;
  alamat: string;
  user_id: string;
  created_at: string;
}

export default function DetailSupplierPage() {
  const router = useRouter();
  const params = useParams();
  const supplierId = params.id as string;
  
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchSupplier = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .eq('id', supplierId)
        .single();

      if (error) {
        console.error('Error fetching supplier:', error);
        toast.error('Gagal memuat data supplier');
        return;
      }

      setSupplier(data);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Terjadi kesalahan saat memuat data');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!supplier) return;
    
    const confirmDelete = window.confirm(
      `Apakah Anda yakin ingin menghapus supplier "${supplier.nama_supplier}"?\n\nTindakan ini tidak dapat dibatalkan.`
    );
    
    if (!confirmDelete) return;

    try {
      setDeleteLoading(true);
      const { error } = await supabase
        .from('suppliers')
        .delete()
        .eq('id', supplierId);

      if (error) {
        console.error('Error deleting supplier:', error);
        toast.error('Gagal menghapus supplier');
        return;
      }

      toast.success('Supplier berhasil dihapus');
      router.push('/dashboard/master-data/supplier');
    } catch (error) {
      console.error('Error:', error);
      toast.error('Terjadi kesalahan saat menghapus supplier');
    } finally {
      setDeleteLoading(false);
    }
  };

  useEffect(() => {
    if (supplierId) {
      fetchSupplier();
    }
  }, [supplierId]);

  const navbarActions = [
    {
      label: 'Kembali',
      onClick: () => router.push('/dashboard/master-data/supplier'),
      icon: ArrowLeft,
      variant: 'outline' as const,
    },
    {
      label: 'Edit',
      onClick: () => router.push(`/dashboard/master-data/supplier/${supplierId}/edit`),
      icon: Edit,
      variant: 'default' as const,
    },
  ];

  if (loading) {
    return (
      <div className="flex flex-col h-full">
        <Navbar 
          title="Detail Supplier" 
          actions={navbarActions}
        />
        <div className="flex-1 p-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-2"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!supplier) {
    return (
      <div className="flex flex-col h-full">
        <Navbar 
          title="Detail Supplier" 
          actions={navbarActions}
        />
        <div className="flex-1 p-6">
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">Supplier tidak ditemukan</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <Navbar 
        title={`Detail Supplier: ${supplier.nama_supplier}`} 
        actions={navbarActions}
      />
      <div className="flex-1 p-4 md:p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
          {/* Detail Section - Left Column */}
          <Card className="shadow-lg border-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm h-fit">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-medium text-gray-900 dark:text-white flex items-center justify-between">
                Informasi Supplier
                <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
                  Aktif
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-4">
              {/* Nama Supplier */}
              <div className="space-y-2">
                <div className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300">
                  <Building2 className="h-4 w-4 mr-2" />
                  Nama Supplier
                </div>
                <div className="text-lg font-semibold text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                  {supplier.nama_supplier}
                </div>
              </div>

              {/* Kontak */}
              <div className="space-y-2">
                <div className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300">
                  <Phone className="h-4 w-4 mr-2" />
                  Kontak
                </div>
                <div className="text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                  {supplier.kontak || (
                    <span className="text-gray-500 dark:text-gray-400 italic">
                      Tidak ada kontak
                    </span>
                  )}
                </div>
              </div>

              {/* Alamat */}
              <div className="space-y-2">
                <div className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300">
                  <MapPin className="h-4 w-4 mr-2" />
                  Alamat
                </div>
                <div className="text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-800 p-3 rounded-lg min-h-[80px]">
                  {supplier.alamat || (
                    <span className="text-gray-500 dark:text-gray-400 italic">
                      Tidak ada alamat
                    </span>
                  )}
                </div>
              </div>

              {/* Metadata */}
              <div className="grid grid-cols-1 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="space-y-2">
                  <div className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300">
                    <Calendar className="h-4 w-4 mr-2" />
                    Tanggal Dibuat
                  </div>
                  <div className="text-gray-900 dark:text-white">
                    {new Date(supplier.created_at).toLocaleDateString('id-ID', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300">
                    <User className="h-4 w-4 mr-2" />
                    ID Supplier
                  </div>
                  <div className="text-gray-900 dark:text-white font-mono text-sm bg-gray-50 dark:bg-gray-800 p-2 rounded">
                    {supplier.id}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <Button
                  variant="outline"
                  onClick={() => router.push(`/dashboard/master-data/supplier/${supplierId}/edit`)}
                  className="border-blue-300 text-blue-600 hover:bg-blue-50 dark:border-blue-600 dark:text-blue-400 dark:hover:bg-blue-900/20"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Supplier
                </Button>
                <Button
                  variant="outline"
                  onClick={handleDelete}
                  disabled={deleteLoading}
                  className="border-red-300 text-red-600 hover:bg-red-50 dark:border-red-600 dark:text-red-400 dark:hover:bg-red-900/20"
                >
                  {deleteLoading ? (
                    <div className="flex items-center">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-red-600 border-t-transparent mr-2" />
                      Menghapus...
                    </div>
                  ) : (
                    <div className="flex items-center">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Hapus Supplier
                    </div>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Information Section - Right Column */}
          <div className="space-y-4">
            {/* Usage Info Card */}
            <Card className="shadow-lg border-0 bg-gradient-to-br from-blue-50/80 to-indigo-50/80 dark:from-blue-900/20 dark:to-indigo-900/20 backdrop-blur-sm border-blue-200 dark:border-blue-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-medium text-gray-900 dark:text-gray-100 flex items-center">
                  📊 Informasi Penggunaan
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-3">
                <div className="grid grid-cols-1 gap-3">
                  <div className="p-3 bg-white/50 dark:bg-gray-800/50 rounded-lg">
                    <div className="text-sm font-medium text-blue-900 dark:text-blue-100">Status</div>
                    <div className="text-lg font-semibold text-blue-800 dark:text-blue-200">Aktif</div>
                  </div>
                  <div className="p-3 bg-white/50 dark:bg-gray-800/50 rounded-lg">
                    <div className="text-sm font-medium text-blue-900 dark:text-blue-100">Transaksi Pembelian</div>
                    <div className="text-lg font-semibold text-blue-800 dark:text-blue-200">-</div>
                    <div className="text-xs text-blue-700 dark:text-blue-300">Belum ada transaksi</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Supplier Preview Card */}
            <Card className="shadow-lg border-0 bg-green-50/80 dark:bg-green-900/20 backdrop-blur-sm border-green-200 dark:border-green-800">
              <CardHeader>
                <CardTitle className="text-lg font-medium text-green-900 dark:text-green-100 flex items-center">
                  👁️ Preview Supplier
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center p-4 bg-white/50 dark:bg-gray-800/50 rounded-lg">
                  <div className="text-2xl font-bold text-green-900 dark:text-green-100 flex items-center justify-center">
                    <Building2 className="h-6 w-6 mr-2" />
                    {supplier.nama_supplier}
                  </div>
                  {supplier.kontak && (
                    <div className="text-sm text-green-700 dark:text-green-300 mt-2">
                      📞 {supplier.kontak}
                    </div>
                  )}
                  {supplier.alamat && (
                    <div className="text-sm text-green-700 dark:text-green-300 mt-1">
                      📍 {supplier.alamat}
                    </div>
                  )}
                  <div className="text-xs text-green-600 dark:text-green-400 mt-3">
                    Dibuat pada {new Date(supplier.created_at).toLocaleDateString('id-ID')}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tips Card */}
            <Card className="shadow-lg border-0 bg-gradient-to-br from-amber-50/80 to-orange-50/80 dark:from-amber-900/20 dark:to-orange-900/20 backdrop-blur-sm border-amber-200 dark:border-amber-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-medium text-gray-900 dark:text-gray-100 flex items-center">
                  💡 Tips Pengelolaan Supplier
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <ul className="text-xs text-amber-800 dark:text-amber-200 space-y-1">
                  <li className="flex items-start leading-tight">
                    <span className="inline-block w-1.5 h-1.5 bg-amber-500 rounded-full mt-1.5 mr-2 flex-shrink-0"></span>
                    <span>Supplier yang sudah digunakan sebaiknya tidak dihapus</span>
                  </li>
                  <li className="flex items-start leading-tight">
                    <span className="inline-block w-1.5 h-1.5 bg-amber-500 rounded-full mt-1.5 mr-2 flex-shrink-0"></span>
                    <span>Pastikan informasi kontak selalu up-to-date</span>
                  </li>
                  <li className="flex items-start leading-tight">
                    <span className="inline-block w-1.5 h-1.5 bg-amber-500 rounded-full mt-1.5 mr-2 flex-shrink-0"></span>
                    <span>Supplier membantu dalam manajemen pembelian</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}