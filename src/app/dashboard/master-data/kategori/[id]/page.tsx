'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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
  const [bahanList, setBahanList] = useState<any[]>([]);
  const [listLoading, setListLoading] = useState<boolean>(true);

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
      await fetchBahanByKategori();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Terjadi kesalahan saat memuat data');
    } finally {
      setLoading(false);
    }
  };

  const fetchBahanByKategori = async () => {
    try {
      setListLoading(true);
      const { data, error } = await supabase
        .from('bahan_baku')
        .select(`
          id,
          nama_bahan_baku,
          stok,
          supplier_eksklusif_id,
          suppliers:supplier_eksklusif_id(nama_supplier),
          unit_dasar:unit_dasar_id(nama_unit)
        `)
        .eq('kategori_id', kategoriId)
        .order('nama_bahan_baku');
      if (error) throw error;
      const normalized = (data || []).map((item: any) => {
        const supplier = Array.isArray(item.suppliers) ? item.suppliers[0] : item.suppliers;
        const unit = Array.isArray(item.unit_dasar) ? item.unit_dasar[0] : item.unit_dasar;
        return {
          id: item.id,
          nama_bahan_baku: item.nama_bahan_baku,
          stok: item.stok || 0,
          unit: unit?.nama_unit || '-',
          supplierEksklusifNama: item.supplier_eksklusif_id ? (supplier?.nama_supplier || '-') : null,
        };
      });
      setBahanList(normalized);
    } catch (e) {
      console.error('Error fetching bahan by kategori:', e);
      toast.error('Gagal memuat daftar bahan untuk kategori ini');
    } finally {
      setListLoading(false);
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
      <div className="flex-1 p-4 md:p-6 space-y-4 bg-white dark:bg-gray-900">
        {/* Compact header */}
        <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-gray-900 dark:text-white">Informasi Kategori</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-sm text-gray-700 dark:text-gray-300">
            <div className="grid gap-3 md:grid-cols-3">
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Nama</div>
                <div className="font-medium text-gray-900 dark:text-gray-100">{kategori.nama_kategori}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Deskripsi</div>
                <div className="text-gray-800 dark:text-gray-200">{kategori.deskripsi || '-'}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Dibuat</div>
                <div className="text-gray-800 dark:text-gray-200">{new Date(kategori.created_at).toLocaleString('id-ID')}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bahan baku in this category */}
        <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-gray-900 dark:text-white">Bahan Baku dalam Kategori Ini</CardTitle>
          </CardHeader>
          <CardContent>
            {listLoading ? (
              <div className="text-sm text-gray-600 dark:text-gray-400">Memuat daftar...</div>
            ) : bahanList.length === 0 ? (
              <div className="text-sm text-gray-600 dark:text-gray-400">Belum ada bahan baku pada kategori ini.</div>
            ) : (
              <div className="rounded-md border border-gray-200 dark:border-gray-800">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nama</TableHead>
                      <TableHead className="w-[140px] text-right">Stok</TableHead>
                      <TableHead className="w-[120px]">Unit</TableHead>
                      <TableHead className="w-[220px]">Supplier Eksklusif</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bahanList.map((b: any) => (
                      <TableRow key={b.id}>
                        <TableCell className="font-medium text-gray-900 dark:text-gray-100">{b.nama_bahan_baku}</TableCell>
                        <TableCell className="text-right">{(b.stok || 0).toLocaleString('id-ID')}</TableCell>
                        <TableCell>{b.unit}</TableCell>
                        <TableCell>
                          {b.supplierEksklusifNama ? (
                            <span className="text-green-600 dark:text-green-400">{b.supplierEksklusifNama}</span>
                          ) : (
                            <span className="text-gray-500">Tidak eksklusif</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
