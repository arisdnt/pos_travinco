'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Edit, Trash2, Calendar, User, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { Navbar } from '@/components/layout/navbar';

interface Kategori {
  id: string;
  nama_kategori: string;
  deskripsi: string;
  user_id: string;
  created_at: string;
}

export default function DetailKategoriPage() {
  const router = useRouter();
  const params = useParams();
  const kategoriId = params.id as string;
  
  const [kategori, setKategori] = useState<Kategori | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchKategori = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('kategori')
        .select('*')
        .eq('id', kategoriId)
        .single();

      if (error) {
        console.error('Error fetching kategori:', error);
        toast.error('Gagal memuat data kategori');
        return;
      }

      setKategori(data);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Terjadi kesalahan saat memuat data');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!kategori) return;
    
    const confirmDelete = window.confirm(
      `Apakah Anda yakin ingin menghapus kategori "${kategori.nama_kategori}"?\n\nTindakan ini tidak dapat dibatalkan.`
    );
    
    if (!confirmDelete) return;

    try {
      setDeleteLoading(true);
      const { error } = await supabase
        .from('kategori')
        .delete()
        .eq('id', kategoriId);

      if (error) {
        console.error('Error deleting kategori:', error);
        toast.error('Gagal menghapus kategori');
        return;
      }

      toast.success('Kategori berhasil dihapus');
      router.push('/dashboard/master-data/kategori');
    } catch (error) {
      console.error('Error:', error);
      toast.error('Terjadi kesalahan saat menghapus kategori');
    } finally {
      setDeleteLoading(false);
    }
  };

  useEffect(() => {
    if (kategoriId) {
      fetchKategori();
    }
  }, [kategoriId]);

  const navbarActions = [
    {
      label: 'Kembali',
      onClick: () => router.push('/dashboard/master-data/kategori'),
      icon: ArrowLeft,
      variant: 'outline' as const,
    },
    {
      label: 'Edit',
      onClick: () => router.push(`/dashboard/master-data/kategori/${kategoriId}/edit`),
      icon: Edit,
      variant: 'default' as const,
    },
  ];

  if (loading) {
    return (
      <div className="flex flex-col h-full">
        <Navbar 
          title="Detail Kategori" 
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

  if (!kategori) {
    return (
      <div className="flex flex-col h-full">
        <Navbar 
          title="Detail Kategori" 
          actions={navbarActions}
        />
        <div className="flex-1 p-6">
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">Kategori tidak ditemukan</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <Navbar 
        title={`Detail Kategori: ${kategori.nama_kategori}`} 
        actions={navbarActions}
      />
      <div className="flex-1 p-4 md:p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
          {/* Detail Section - Left Column */}
          <Card className="shadow-lg border-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm h-fit">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-medium text-gray-900 dark:text-white flex items-center justify-between">
                Informasi Kategori
                <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
                  Aktif
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-4">
              {/* Nama Kategori */}
              <div className="space-y-2">
                <div className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300">
                  <FileText className="h-4 w-4 mr-2" />
                  Nama Kategori
                </div>
                <div className="text-lg font-semibold text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                  {kategori.nama_kategori}
                </div>
              </div>

              {/* Deskripsi */}
              <div className="space-y-2">
                <div className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300">
                  <FileText className="h-4 w-4 mr-2" />
                  Deskripsi
                </div>
                <div className="text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-800 p-3 rounded-lg min-h-[80px]">
                  {kategori.deskripsi || (
                    <span className="text-gray-500 dark:text-gray-400 italic">
                      Tidak ada deskripsi
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
                    {new Date(kategori.created_at).toLocaleDateString('id-ID', {
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
                    ID Kategori
                  </div>
                  <div className="text-gray-900 dark:text-white font-mono text-sm bg-gray-50 dark:bg-gray-800 p-2 rounded">
                    {kategori.id}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <Button
                  variant="outline"
                  onClick={() => router.push(`/dashboard/master-data/kategori/${kategoriId}/edit`)}
                  className="border-blue-300 text-blue-600 hover:bg-blue-50 dark:border-blue-600 dark:text-blue-400 dark:hover:bg-blue-900/20"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Kategori
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
                      Hapus Kategori
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
                    <div className="text-sm font-medium text-blue-900 dark:text-blue-100">Produk Terkait</div>
                    <div className="text-lg font-semibold text-blue-800 dark:text-blue-200">-</div>
                    <div className="text-xs text-blue-700 dark:text-blue-300">Belum ada produk</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Category Preview Card */}
            <Card className="shadow-lg border-0 bg-green-50/80 dark:bg-green-900/20 backdrop-blur-sm border-green-200 dark:border-green-800">
              <CardHeader>
                <CardTitle className="text-lg font-medium text-green-900 dark:text-green-100 flex items-center">
                  👁️ Preview Kategori
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center p-4 bg-white/50 dark:bg-gray-800/50 rounded-lg">
                  <div className="text-2xl font-bold text-green-900 dark:text-green-100">
                    {kategori.nama_kategori}
                  </div>
                  {kategori.deskripsi && (
                    <div className="text-sm text-green-700 dark:text-green-300 mt-2">
                      {kategori.deskripsi}
                    </div>
                  )}
                  <div className="text-xs text-green-600 dark:text-green-400 mt-3">
                    Dibuat pada {new Date(kategori.created_at).toLocaleDateString('id-ID')}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tips Card */}
            <Card className="shadow-lg border-0 bg-gradient-to-br from-amber-50/80 to-orange-50/80 dark:from-amber-900/20 dark:to-orange-900/20 backdrop-blur-sm border-amber-200 dark:border-amber-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-medium text-gray-900 dark:text-gray-100 flex items-center">
                  💡 Tips Pengelolaan Kategori
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <ul className="text-xs text-amber-800 dark:text-amber-200 space-y-1">
                  <li className="flex items-start leading-tight">
                    <span className="inline-block w-1.5 h-1.5 bg-amber-500 rounded-full mt-1.5 mr-2 flex-shrink-0"></span>
                    <span>Kategori yang sudah digunakan sebaiknya tidak dihapus</span>
                  </li>
                  <li className="flex items-start leading-tight">
                    <span className="inline-block w-1.5 h-1.5 bg-amber-500 rounded-full mt-1.5 mr-2 flex-shrink-0"></span>
                    <span>Gunakan deskripsi untuk memberikan penjelasan lebih detail</span>
                  </li>
                  <li className="flex items-start leading-tight">
                    <span className="inline-block w-1.5 h-1.5 bg-amber-500 rounded-full mt-1.5 mr-2 flex-shrink-0"></span>
                    <span>Kategori membantu dalam pelaporan dan analisis</span>
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