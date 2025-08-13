'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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
  nama_unit: string;
  nama_kategori: string;
  created_at: string;
  updated_at?: string;
}

interface PergerakanBahanBaku {
  tanggal: string;
  jenis: 'Pembelian' | 'Pemakaian';
  ref_id: string;
  keterangan: string | null;
  jumlah: number;
  unit: string | null;
}



export default function DetailBahanBakuPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [bahanBaku, setBahanBaku] = useState<BahanBaku | null>(null);
  const [movements, setMovements] = useState<PergerakanBahanBaku[]>([]);
  const [movementsLoading, setMovementsLoading] = useState<boolean>(true);

  useEffect(() => {
    if (id) {
      fetchBahanBaku();
    }
  }, [id]);

  const fetchBahanBaku = async () => {
    try {
      const { data, error } = await supabase
        .from('view_bahan_baku_detail')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      setBahanBaku(data);
      await fetchPergerakan();
    } catch (error: any) {
      console.error('Error fetching bahan baku:', error);
      toast.error('Gagal memuat data bahan baku');
      router.push('/dashboard/bahan-baku');
    } finally {
      setLoading(false);
    }
  };

  const fetchPergerakan = async () => {
    try {
      setMovementsLoading(true);
      const { data, error } = await supabase
        .from('view_pergerakan_bahan_baku')
        .select('tanggal, jenis, ref_id, keterangan, jumlah, unit')
        .eq('bahan_baku_id', id)
        .order('tanggal', { ascending: false });
      if (error) throw error;
      setMovements((data || []) as PergerakanBahanBaku[]);
    } catch (error) {
      console.error('Error fetching pergerakan bahan baku:', error);
      toast.error('Gagal memuat pergerakan bahan baku');
    } finally {
      setMovementsLoading(false);
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

      <div className="flex-1 p-4 md:p-6 space-y-4 bg-white dark:bg-gray-900">
        {/* Compact Summary Card */}
        <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <Package className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  {bahanBaku.nama_bahan_baku}
                </h2>
                <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                  <span className="inline-flex items-center gap-1">
                    Kategori:
                    <span className="font-medium text-gray-800 dark:text-gray-200">{bahanBaku.nama_kategori || 'Tanpa Kategori'}</span>
                  </span>
                  <span className="inline-flex items-center gap-1">
                    Unit:
                    <span className="font-mono text-gray-800 dark:text-gray-200">{bahanBaku.nama_unit || '-'}</span>
                  </span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-gray-500 dark:text-gray-400">Stok</div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {bahanBaku.stok}
                  <span className="ml-1 text-sm font-normal text-gray-500 dark:text-gray-400">{bahanBaku.nama_unit || ''}</span>
                </div>
                <div className="mt-1">
                  <Badge variant={bahanBaku.stok > 0 ? 'default' : 'destructive'}>
                    {bahanBaku.stok > 0 ? 'Tersedia' : 'Habis'}
                  </Badge>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid gap-3 md:grid-cols-2 text-sm">
              <div className="text-gray-600 dark:text-gray-400">
                <span className="mr-1">Dibuat:</span>
                <span className="font-medium text-gray-800 dark:text-gray-200">{formatDateTime(bahanBaku.created_at)}</span>
              </div>
              {bahanBaku.updated_at && (
                <div className="text-gray-600 dark:text-gray-400">
                  <span className="mr-1">Diperbarui:</span>
                  <span className="font-medium text-gray-800 dark:text-gray-200">{formatDateTime(bahanBaku.updated_at)}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Movement Table */}
        <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-gray-900 dark:text-white">Pergerakan Bahan Baku</CardTitle>
          </CardHeader>
          <CardContent>
            {movementsLoading ? (
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <Loader2 className="w-4 h-4 animate-spin" /> Memuat pergerakan...
              </div>
            ) : movements.length === 0 ? (
              <p className="text-sm text-gray-600 dark:text-gray-400">Belum ada pergerakan untuk bahan baku ini.</p>
            ) : (
              <div className="rounded-md border border-gray-200 dark:border-gray-800">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[160px]">Tanggal</TableHead>
                      <TableHead className="w-[120px]">Jenis</TableHead>
                      <TableHead>Keterangan</TableHead>
                      <TableHead className="text-right w-[160px]">Jumlah</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {movements.map((m, idx) => (
                      <TableRow key={`${m.ref_id}-${idx}`}>
                        <TableCell className="whitespace-nowrap">{formatDateTime(m.tanggal)}</TableCell>
                        <TableCell>
                          <span className={m.jenis === 'Pembelian' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                            {m.jenis}
                          </span>
                        </TableCell>
                        <TableCell className="text-gray-700 dark:text-gray-300">
                          {m.keterangan || '-'}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          <span className={m.jenis === 'Pembelian' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                            {m.jenis === 'Pembelian' ? '+' : '-'}{Math.abs(m.jumlah).toLocaleString('id-ID')} {m.unit || ''}
                          </span>
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
