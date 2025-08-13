'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ColumnDef } from '@tanstack/react-table';
import { StatCard, StatCardVariants } from '@/components/ui/stat-card';
import { DataTable, SortableHeader, ActionDropdown } from '@/components/ui/data-table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { TrendingUp, DollarSign, ShoppingCart, Users, Package, Plus, Upload, Eye, Edit, Trash2, MoreHorizontal } from 'lucide-react';
import { Navbar, createNavbarActions } from '@/components/layout/navbar';
import { formatCurrency, formatDate } from '@/lib/utils';
import { supabase, getCurrentUser } from '@/lib/supabase';
import { toast } from 'sonner';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { exportToXlsx } from '@/lib/exporter';

// Types
interface Penjualan {
  id: string;
  produk_jadi: {
    nama_produk_jadi: string;
    harga_jual: number;
  } | null;
  jumlah: number;
  total_harga: number;
  tanggal: string;
  catatan?: string;
}



export default function PenjualanPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [penjualanData, setPenjualanData] = useState<Penjualan[]>([]);
  const [loading, setLoading] = useState(true);
  const [preset, setPreset] = useState<'this_week' | 'last_2_weeks' | 'last_3_weeks' | 'this_month' | 'last_month' | 'custom'>('this_week');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    penjualan: Penjualan | null;
    loading: boolean;
  }>({ open: false, penjualan: null, loading: false });

  useEffect(() => {
    // initialize to this week
    const now = new Date();
    const day = now.getDay();
    const diffToMonday = (day === 0 ? 6 : day - 1);
    const monday = new Date(now);
    monday.setDate(now.getDate() - diffToMonday);
    monday.setHours(0, 0, 0, 0);
    setStartDate(monday.toISOString().split('T')[0]);
    setEndDate(new Date().toISOString().split('T')[0]);
    fetchPenjualan(monday.toISOString(), new Date().toISOString());
  }, []);

  const fetchPenjualan = async (startISO?: string, endISO?: string) => {
    try {
      setLoading(true);
      let query = supabase
        .from('penjualan')
        .select(`
          id,
          jumlah,
          total_harga,
          tanggal,
          catatan,
          produk_jadi(
            nama_produk_jadi,
            harga_jual
          )
        `);
      if (startISO) query = query.gte('tanggal', startISO);
      if (endISO) query = query.lte('tanggal', endISO);
      query = query.order('tanggal', { ascending: false });
      const { data, error } = await query;

      if (error) throw error;
      setPenjualanData((data as any) || []);
    } catch (error) {
      console.error('Error fetching penjualan:', error);
      toast.error('Gagal memuat data penjualan');
    } finally {
      setLoading(false);
    }
  };

  const applyPreset = () => {
    let start: Date | null = null;
    let end: Date | null = new Date();
    const now = new Date();
    switch (preset) {
      case 'this_week': {
        const day = now.getDay();
        const diffToMonday = (day === 0 ? 6 : day - 1);
        start = new Date(now);
        start.setDate(now.getDate() - diffToMonday);
        break;
      }
      case 'last_2_weeks': {
        start = new Date(now);
        start.setDate(now.getDate() - 14);
        break;
      }
      case 'last_3_weeks': {
        start = new Date(now);
        start.setDate(now.getDate() - 21);
        break;
      }
      case 'this_month': {
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      }
      case 'last_month': {
        start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
        break;
      }
      case 'custom': {
        break;
      }
    }
    if (preset !== 'custom' && start) {
      setStartDate(start.toISOString().split('T')[0]);
      setEndDate(new Date().toISOString().split('T')[0]);
      fetchPenjualan(start.toISOString(), end?.toISOString());
    } else if (preset === 'custom' && startDate && endDate) {
      const s = new Date(startDate); s.setHours(0,0,0,0);
      const e = new Date(endDate); e.setHours(23,59,59,999);
      fetchPenjualan(s.toISOString(), e.toISOString());
    } else {
      toast.info('Pilih tanggal mulai dan akhir untuk rentang kustom');
    }
  };

  const handleDelete = useCallback((penjualan: Penjualan) => {
    setDeleteDialog({ open: true, penjualan, loading: false });
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (!deleteDialog.penjualan) return;

    try {
      const user = await getCurrentUser();
      if (!user) {
        toast.error('Anda harus login terlebih dahulu');
        return;
      }

      setDeleteDialog(prev => ({ ...prev, loading: true }));

      const { error } = await supabase
        .from('penjualan')
        .delete()
        .eq('id', deleteDialog.penjualan.id);

      if (error) throw error;

      toast.success('Transaksi penjualan berhasil dihapus!');
      setDeleteDialog({ open: false, penjualan: null, loading: false });
      fetchPenjualan(); // Refresh data
    } catch (error: any) {
      console.error('Error deleting penjualan:', error);
      toast.error(error.message || 'Gagal menghapus transaksi penjualan');
      setDeleteDialog(prev => ({ ...prev, loading: false }));
    }
  }, [deleteDialog.penjualan, fetchPenjualan]);



  const columns = useMemo<ColumnDef<Penjualan>[]>(
    () => [
      {
        accessorKey: "produk_jadi.nama_produk_jadi",
        header: ({ column }) => (
          <SortableHeader column={column}>Produk</SortableHeader>
        ),
        cell: ({ row }) => (
          <div className="font-medium text-gray-900 dark:text-white">
            {row.original.produk_jadi?.nama_produk_jadi || 'N/A'}
          </div>
        ),
      },
      {
        accessorKey: "tanggal",
        header: ({ column }) => (
          <SortableHeader column={column}>Tanggal</SortableHeader>
        ),
        cell: ({ row }) => (
          <div className="font-medium text-gray-900 dark:text-white">
            {formatDate(row.getValue("tanggal"))}
          </div>
        ),
      },
      {
        accessorKey: "jumlah",
        header: "Jumlah",
        cell: ({ row }) => (
          <div className="font-medium text-gray-900 dark:text-white">
            {row.getValue("jumlah")} unit
          </div>
        ),
      },
      {
        accessorKey: "catatan",
        header: "Catatan",
        cell: ({ row }) => (
          <div className="font-medium text-gray-900 dark:text-white">
            {row.getValue("catatan") || '-'}
          </div>
        ),
      },
      {
        accessorKey: "total_harga",
        header: ({ column }) => (
          <SortableHeader column={column}>Total</SortableHeader>
        ),
        cell: ({ row }) => (
          <div className="font-semibold text-green-600">
            {formatCurrency(row.getValue("total_harga"))}
          </div>
        ),
      },

      {
        id: "actions",
        header: "Aksi",
        cell: ({ row }) => (
          <ActionDropdown>
            <DropdownMenuItem onClick={() => router.push(`/dashboard/penjualan/detail/${row.original.id}`)}>
              <Eye className="mr-2 h-4 w-4" />
              Detail
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push(`/dashboard/penjualan/edit/${row.original.id}`)}>
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => handleDelete(row.original)}
              className="text-red-600 focus:text-red-600"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Hapus
            </DropdownMenuItem>
          </ActionDropdown>
        ),
      },
    ],
    [router]
  )

  const handleExport = async () => {
    try {
      const rows = penjualanData.map((item) => ({
        Produk: item.produk_jadi?.nama_produk_jadi || '-',
        'Harga Satuan': item.produk_jadi?.harga_jual || 0,
        Jumlah: item.jumlah,
        Total: item.total_harga || 0,
        Tanggal: new Date(item.tanggal).toLocaleString('id-ID'),
        Catatan: item.catatan || '-',
      }));
      await exportToXlsx('penjualan', {
        sheetName: 'Penjualan',
        columns: [
          { header: 'Produk', key: 'Produk', width: 28 },
          { header: 'Harga Satuan', key: 'Harga Satuan', width: 16 },
          { header: 'Jumlah', key: 'Jumlah', width: 12 },
          { header: 'Total', key: 'Total', width: 16 },
          { header: 'Tanggal', key: 'Tanggal', width: 22 },
          { header: 'Catatan', key: 'Catatan', width: 36 },
        ],
        rows,
      });
      toast.success('Export penjualan berhasil');
    } catch (e) {
      console.error('Export penjualan gagal:', e);
      toast.error('Export gagal');
    }
  };

  const navbarActions = useMemo(() => [
    {
      label: "Tambah Penjualan",
      icon: Plus,
      onClick: () => router.push('/dashboard/penjualan/add'),
      variant: "default" as const
    },
    { label: "Export", onClick: handleExport, variant: "outline" as const },
    { label: "Filter", onClick: () => console.log('Filter'), variant: "outline" as const }
  ], [router, handleExport]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <span>Memuat data penjualan...</span>
        </div>
      </div>
    );
  }

  // Calculate stats
  const totalRevenue = penjualanData.reduce((sum, item) => sum + (item.total_harga || 0), 0);
  const totalTransactions = penjualanData.length;
  const uniqueProducts = new Set(penjualanData.map(item => item.produk_jadi?.nama_produk_jadi)).size;
  const totalProductsSold = penjualanData.reduce((sum, item) => sum + (item.jumlah || 0), 0);

  return (
    <div className="flex flex-col h-full">
      <Navbar title="Penjualan" actions={navbarActions} />
      
      <div className="flex-1 p-4 md:p-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <StatCard
            title="Total Penjualan"
            value={formatCurrency(totalRevenue)}
            subtitle="pendapatan"
            icon={DollarSign}
            {...StatCardVariants.success}
          />
          <StatCard
            title="Transaksi"
            value={totalTransactions.toString()}
            subtitle="total transaksi"
            icon={ShoppingCart}
            {...StatCardVariants.primary}
          />
          <StatCard
            title="Produk Unik"
            value={uniqueProducts.toString()}
            subtitle="jenis produk"
            icon={Package}
            {...StatCardVariants.purple}
          />
          <StatCard
            title="Produk Terjual"
            value={totalProductsSold.toString()}
            subtitle="unit terjual"
            icon={TrendingUp}
            {...StatCardVariants.warning}
          />
        </div>

        {/* Main Content */}
        <Card className="shadow-lg border-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
          <CardContent className="p-6 space-y-4">
            {/* Filter Waktu (di dalam tabel) */}
            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={preset}
                onChange={(e) => setPreset(e.target.value as any)}
                className="h-9 text-sm rounded-lg border border-gray-300 px-2 dark:bg-gray-900 dark:border-gray-700"
                title="Preset waktu"
              >
                <option value="this_week">Minggu ini</option>
                <option value="last_2_weeks">2 minggu terakhir</option>
                <option value="last_3_weeks">3 minggu terakhir</option>
                <option value="this_month">Bulan ini</option>
                <option value="last_month">Bulan lalu</option>
                <option value="custom">Rentang tanggal</option>
              </select>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-9 text-sm rounded-lg border border-gray-300 px-2 dark:bg-gray-900 dark:border-gray-700"
                title="Tanggal mulai"
              />
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-9 text-sm rounded-lg border border-gray-300 px-2 dark:bg-gray-900 dark:border-gray-700"
                title="Tanggal selesai"
              />
              <Button variant="outline" size="sm" onClick={applyPreset}>Terapkan</Button>
            </div>
            <DataTable
              columns={columns}
              data={penjualanData}
              searchKey="produk_jadi.nama_produk_jadi"
              searchPlaceholder="Cari produk..."
              hideColumnToggle={true}
            />
          </CardContent>
        </Card>
      </div>

      <ConfirmationDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog(prev => ({ ...prev, open }))}
        title="Hapus Transaksi Penjualan"
        description={`Apakah Anda yakin ingin menghapus transaksi penjualan ${deleteDialog.penjualan?.produk_jadi?.nama_produk_jadi || 'ini'}? Tindakan ini tidak dapat dibatalkan.`}
        onConfirm={handleConfirmDelete}
        loading={deleteDialog.loading}
        confirmText="Hapus"
        cancelText="Batal"
      />
    </div>
  );
}
