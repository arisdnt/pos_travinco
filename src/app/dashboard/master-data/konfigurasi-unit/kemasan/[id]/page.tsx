'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Navbar } from '@/components/layout/navbar';
import { ArrowLeft, Edit, Trash2, Package, Calendar, Ruler } from 'lucide-react';
import { toast } from 'sonner';
import { formatDate } from '@/lib/utils';
import type { Kemasan } from '@/types/master-data';

export default function KemasanDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  
  const [kemasan, setKemasan] = useState<Kemasan | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  const fetchKemasan = async () => {
    try {
      setLoading(true);
      const supabase = createClient();
      
      const { data, error } = await supabase
        .from('kemasan')
        .select(`
          *,
          unit_dasar:unit_dasar_id(nama_unit, deskripsi)
        `)
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error fetching kemasan:', error);
        toast.error('Gagal memuat data kemasan');
        router.push('/dashboard/master-data/konfigurasi-unit');
        return;
      }

      setKemasan(data);
    } catch (error) {
      console.error('Error in fetchKemasan:', error);
      toast.error('Terjadi kesalahan saat memuat data');
      router.push('/dashboard/master-data/konfigurasi-unit');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    router.push(`/dashboard/master-data/konfigurasi-unit/kemasan/${id}/edit`);
  };

  const handleDelete = async () => {
    if (!kemasan) return;
    
    if (!confirm(`Apakah Anda yakin ingin menghapus kemasan "${kemasan.nama_kemasan}"?\n\nTindakan ini tidak dapat dibatalkan.`)) {
      return;
    }

    try {
      setDeleting(true);
      const supabase = createClient();
      
      const { error } = await supabase
        .from('kemasan')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting kemasan:', error);
        if (error.code === '23503') {
          toast.error('Kemasan tidak dapat dihapus karena masih digunakan oleh data lain');
        } else {
          toast.error('Gagal menghapus kemasan');
        }
      } else {
        toast.success('Kemasan berhasil dihapus');
        router.push('/dashboard/master-data/konfigurasi-unit');
      }
    } catch (error) {
      console.error('Error in handleDelete:', error);
      toast.error('Terjadi kesalahan saat menghapus data');
    } finally {
      setDeleting(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchKemasan();
    }
  }, [id]);

  const navbarActions = [
    {
      label: 'Edit',
      onClick: handleEdit,
      icon: Edit,
      variant: 'default' as const
    },
    {
      label: 'Hapus',
      onClick: handleDelete,
      icon: Trash2,
      variant: 'destructive' as const,
      loading: deleting
    }
  ];

  if (loading) {
    return (
      <div className="flex flex-col h-full">
        <Navbar
          title="Detail Kemasan"
          showBackButton
          backUrl="/dashboard/master-data/konfigurasi-unit"
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

  if (!kemasan) {
    return (
      <div className="flex flex-col h-full">
        <Navbar
          title="Detail Kemasan"
          showBackButton
          backUrl="/dashboard/master-data/konfigurasi-unit"
        />
        <div className="flex-1 p-6">
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">Kemasan tidak ditemukan</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <Navbar
        title="Detail Kemasan"
        showBackButton
        backUrl="/dashboard/master-data/konfigurasi-unit"
        actions={navbarActions}
      />
      
      <div className="flex-1 p-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/20">
                <Package className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
              <span>{kemasan.nama_kemasan}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Nama Kemasan
                </label>
                <p className="mt-1 text-sm text-gray-900 dark:text-white">
                  {kemasan.nama_kemasan}
                </p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Unit Dasar
                </label>
                <p className="mt-1 text-sm text-gray-900 dark:text-white flex items-center space-x-2">
                  <Ruler className="h-4 w-4 text-gray-400" />
                  <span>{kemasan.unit_dasar?.nama_unit || 'N/A'}</span>
                </p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Nilai Konversi
                </label>
                <p className="mt-1 text-sm text-gray-900 dark:text-white">
                  1 {kemasan.nama_kemasan} = {kemasan.nilai_konversi} {kemasan.unit_dasar?.nama_unit || ''}
                </p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Tanggal Dibuat
                </label>
                <p className="mt-1 text-sm text-gray-900 dark:text-white flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <span>{kemasan.created_at ? formatDate(kemasan.created_at) : '-'}</span>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Informasi Unit Dasar */}
        {kemasan.unit_dasar && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-3">
                <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/20">
                  <Ruler className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <span>Informasi Unit Dasar</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Nama Unit
                  </label>
                  <p className="mt-1 text-sm text-gray-900 dark:text-white">
                    {kemasan.unit_dasar.nama_unit}
                  </p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Deskripsi
                  </label>
                  <p className="mt-1 text-sm text-gray-900 dark:text-white">
                    {kemasan.unit_dasar.deskripsi || '-'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}