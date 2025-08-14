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
import { DateTimeDisplay } from '@/components/ui/date-time-display';
import { formatCurrency, formatDate } from '@/lib/utils';
import { supabase, getCurrentUser } from '@/lib/supabase';
import { toast } from 'sonner';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { exportToXlsx } from '@/lib/exporter';
import SearchAndFilterForm from '@/components/SearchAndFilterForm';

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
  const [searchValue, setSearchValue] = useState('');
  const [penjualanData, setPenjualanData] = useState<Penjualan[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    penjualan: Penjualan | null;
    loading: boolean;
  }>({ open: false, penjualan: null, loading: false });

  useEffect(() => {
    // Initialize default range to current month (1 -> last day)
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    
    // Create dates in local timezone to avoid UTC conversion issues
    const monthStart = new Date(year, month, 1);
    const monthEnd = new Date(year, month + 1, 0);
    
    // Format dates as YYYY-MM-DD for input fields (local date)
    const startDateStr = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    const endDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(monthEnd.getDate()).padStart(2, '0')}`;
    
    setStartDate(startDateStr);
    setEndDate(endDateStr);
    
    // For API calls, use proper ISO strings with time
    monthStart.setHours(0, 0, 0, 0);
    monthEnd.setHours(23, 59, 59, 999);
    fetchPenjualan(monthStart.toISOString(), monthEnd.toISOString());
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

  const applyDateRange = () => {
    if (!startDate || !endDate) {
      toast.info('Pilih tanggal mulai dan akhir');
      return;
    }
    const s = new Date(startDate); s.setHours(0,0,0,0);
    const e = new Date(endDate); e.setHours(23,59,59,999);
    fetchPenjualan(s.toISOString(), e.toISOString());
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

  // Filter data based on search value
  const filteredData = useMemo(() => {
    if (!searchValue.trim()) return penjualanData;
    
    return penjualanData.filter(item => {
      const produkJadi = item.produk_jadi?.nama_produk_jadi?.toLowerCase() || '';
      const catatan = item.catatan?.toLowerCase() || '';
      const searchTerm = searchValue.toLowerCase();
      
      return produkJadi.includes(searchTerm) || 
             catatan.includes(searchTerm);
    });
  }, [penjualanData, searchValue]);

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
      <Navbar title="Penjualan" actions={navbarActions}>
        <DateTimeDisplay />
      </Navbar>
      
      <div className="flex-1 p-4 md:p-6 space-y-4">
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

        {/* Search and Filter Form */}
        <SearchAndFilterForm
          searchValue={searchValue}
          onSearchChange={setSearchValue}
          searchPlaceholder="Cari produk atau catatan..."
          startDate={startDate}
          endDate={endDate}
          onChangeStart={setStartDate}
          onChangeEnd={setEndDate}
          onApply={applyDateRange}
        />

        {/* Main Content */}
        <Card className="shadow-sm border bg-white dark:bg-gray-900">
          <CardContent className="p-3">
            <DataTable
              columns={columns}
              data={filteredData}
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
