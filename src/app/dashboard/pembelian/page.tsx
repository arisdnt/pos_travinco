'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShoppingCart, TrendingUp, Calendar, Package, MoreHorizontal, DollarSign, Plus, Edit, Trash2, Eye } from 'lucide-react';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { StatCard, StatCardVariants } from '@/components/ui/stat-card';
import { DataTable, SortableHeader, ActionDropdown } from '@/components/ui/data-table';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Navbar, createNavbarActions } from '@/components/layout/navbar';
import { supabase, getCurrentUser } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { exportToXlsx } from '@/lib/exporter';





export default function PembelianPage() {
  const router = useRouter();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [preset, setPreset] = useState<'this_week' | 'last_2_weeks' | 'last_3_weeks' | 'this_month' | 'last_month' | 'custom'>('this_week');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    pembelian: any | null;
    loading: boolean;
  }>({ open: false, pembelian: null, loading: false });

  useEffect(() => {
    console.log('🚀 Component mounted, memulai fetch data...');
    // Initialize default range for this week (Mon -> today)
    const now = new Date();
    const day = now.getDay();
    const diffToMonday = (day === 0 ? 6 : day - 1);
    const monday = new Date(now);
    monday.setDate(now.getDate() - diffToMonday);
    monday.setHours(0, 0, 0, 0);
    const startISO = monday.toISOString();
    const endISO = new Date().toISOString();
    setStartDate(monday.toISOString().split('T')[0]);
    setEndDate(new Date().toISOString().split('T')[0]);
    fetchPembelianData(startISO, endISO);
  }, []);

  // Log perubahan data
  useEffect(() => {
    console.log('📈 Data pembelian berubah:', {
      count: data.length,
      items: data.slice(0, 3) // Log 3 item pertama untuk debugging
    });
  }, [data]);

  const fetchPembelianData = async (startISO?: string, endISO?: string) => {
    try {
      console.log('🔄 Memulai fetchPembelianData...');
      setLoading(true);
      
      const user = await getCurrentUser();
      console.log('👤 User data:', user);
      
      if (!user) {
        console.error('❌ User tidak ditemukan');
        toast.error('User tidak ditemukan');
        return;
      }

      console.log('🔍 Mengambil data pembelian untuk user_id:', user.id);
      
      // First try with user_id filter
      let query = supabase
        .from('pembelian')
        .select(`
          *,
          bahan_baku:bahan_baku_id(
            nama_bahan_baku,
            unit_dasar:unit_dasar_id(nama_unit)
          ),
          suppliers:supplier_id(
            nama_supplier,
            kontak
          ),
          kemasan:kemasan_id(
            nama_kemasan,
            nilai_konversi,
            unit_dasar:unit_dasar_id(nama_unit)
          )
        `)
        .eq('user_id', user.id);
      if (startISO) query = query.gte('tanggal', startISO);
      if (endISO) query = query.lte('tanggal', endISO);
      query = query.order('tanggal', { ascending: false });

      let { data: pembelianData, error } = await query;

      console.log('📊 Query result untuk user pembelian:', {
        data: pembelianData,
        error: error,
        count: pembelianData?.length || 0
      });

      // If no data found with user_id, try without user_id filter (for sample data)
      if (!error && (!pembelianData || pembelianData.length === 0)) {
        console.log('⚠️ Tidak ada data user, mencoba mengambil data sampel...');
        
        let sampleQuery = supabase.from('pembelian').select(`
            *,
            bahan_baku:bahan_baku_id(
              nama_bahan_baku,
              unit_dasar:unit_dasar_id(nama_unit)
            ),
            suppliers:supplier_id(
              nama_supplier,
              kontak
            ),
            kemasan:kemasan_id(
              nama_kemasan,
              nilai_konversi,
              unit_dasar:unit_dasar_id(nama_unit)
            )
          `);
        if (startISO) sampleQuery = sampleQuery.gte('tanggal', startISO);
        if (endISO) sampleQuery = sampleQuery.lte('tanggal', endISO);
        sampleQuery = sampleQuery.order('tanggal', { ascending: false });
        const { data: sampleData, error: sampleError } = await sampleQuery;
        
        console.log('📊 Query result untuk sample data:', {
          data: sampleData,
          error: sampleError,
          count: sampleData?.length || 0
        });
        
        if (!sampleError) {
          pembelianData = sampleData;
        }
      }

      if (error) throw error;
      console.log('📝 Setting data:', pembelianData?.length || 0, 'items');
      setData(pembelianData || []);
    } catch (error) {
      console.error('💥 Error fetching pembelian data:', error);
      toast.error('Gagal memuat data pembelian');
    } finally {
      console.log('✅ fetchPembelianData selesai');
      setLoading(false);
    }
  };

  const handleAdd = () => {
    router.push('/dashboard/pembelian/add');
  };

  const handleEdit = (id: string) => {
    router.push(`/dashboard/pembelian/edit/${id}`);
  };

  const handleDelete = useCallback((pembelian: any) => {
    setDeleteDialog({ open: true, pembelian, loading: false });
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (!deleteDialog.pembelian) return;

    try {
      const user = await getCurrentUser();
      if (!user) {
        toast.error('Anda harus login terlebih dahulu');
        return;
      }

      setDeleteDialog(prev => ({ ...prev, loading: true }));
      console.log('🗑️ Menghapus pembelian dengan id:', deleteDialog.pembelian.id);
      
      const { error } = await supabase
        .from('pembelian')
        .delete()
        .eq('id', deleteDialog.pembelian.id);

      if (error) {
        console.error('❌ Error deleting pembelian:', error);
        throw error;
      }

      console.log('✅ Pembelian berhasil dihapus');
      toast.success('Data pembelian berhasil dihapus');
      setDeleteDialog({ open: false, pembelian: null, loading: false });
      fetchPembelianData();
    } catch (error) {
      console.error('💥 Error deleting pembelian:', error);
      toast.error('Gagal menghapus data pembelian');
      setDeleteDialog(prev => ({ ...prev, loading: false }));
    }
  }, [deleteDialog.pembelian, fetchPembelianData]);

  // DataTable handles filtering internally with searchKey

  const totalPembelian = data.reduce((sum, item) => sum + (item.harga_beli || 0), 0);
  const totalTransaksi = data.length;
  const thisMonthPembelian = data.filter(item => {
    const now = new Date();
    const itemDate = new Date(item.tanggal);
    return itemDate.getMonth() === now.getMonth() && itemDate.getFullYear() === now.getFullYear();
  });
  const thisMonthTotal = thisMonthPembelian.reduce((sum, item) => sum + (item.harga_beli || 0), 0);

  const columns = useMemo<ColumnDef<any>[]>(
    () => [
      {
        accessorKey: "bahan_baku",
        header: ({ column }) => (
          <SortableHeader column={column}>Bahan Baku</SortableHeader>
        ),
        cell: ({ row }) => (
          <div>
            <div className="font-medium text-gray-900 dark:text-white">
              {row.original.bahan_baku?.nama_bahan_baku || 'N/A'}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {row.original.catatan || 'Tidak ada catatan'}
            </div>
          </div>
        ),
      },
      {
        accessorKey: "asal_barang",
        header: "Asal Barang",
        cell: ({ row }) => {
          const asalBarang = row.getValue("asal_barang") as string;
          return (
            <Badge variant={asalBarang === 'reservasi' ? 'secondary' : 'default'}>
              {asalBarang === 'reservasi' ? 'Dari Reservasi' : 'Pembelian Langsung'}
            </Badge>
          );
        },
      },
      {
        id: "supplier",
        header: "Supplier",
        cell: ({ row }) => {
          const supplier = row.original.suppliers;
          const asalBarang = row.original.asal_barang;
          
          if (asalBarang === 'reservasi' && supplier) {
            return (
              <div>
                <div className="font-medium text-gray-900 dark:text-white">
                  {supplier.nama_supplier}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {supplier.kontak || 'Tidak ada kontak'}
                </div>
              </div>
            );
          }
          return <span className="text-gray-400">-</span>;
        },
      },
      {
        accessorKey: "jumlah",
        header: "Jumlah",
        cell: ({ row }) => {
          const jumlah = row.getValue("jumlah") as number;
          const kemasan = row.original.kemasan;
          const bahanBaku = row.original.bahan_baku;
          
          if (kemasan) {
            // Logika perbaikan: jika jumlah dalam satuan dasar, hitung pieces
            // jika jumlah sudah dalam pieces, gunakan langsung
            let pieces;
            
            if (jumlah >= kemasan.nilai_konversi) {
              // Jumlah dalam satuan dasar, hitung pieces
              pieces = Math.round(jumlah / kemasan.nilai_konversi);
            } else if (jumlah < 1 && jumlah > 0) {
              // Kemungkinan jumlah sudah dalam pieces tapi dalam desimal
              pieces = Math.max(1, Math.round(jumlah * kemasan.nilai_konversi / kemasan.nilai_konversi));
            } else {
              // Jumlah sudah dalam pieces
              pieces = Math.max(1, Math.round(jumlah));
            }
            
            const ukuranKemasan = kemasan.nilai_konversi;
            const unitDasar = kemasan.unit_dasar?.nama_unit || bahanBaku?.unit_dasar?.nama_unit || 'unit';
            
            return (
              <div className="font-medium text-gray-900 dark:text-white">
                <div>{pieces} pcs</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  @ {ukuranKemasan.toLocaleString('id-ID')} {unitDasar} per {kemasan.nama_kemasan}
                </div>
              </div>
            );
          } else {
            // Jika tidak ada kemasan, tampilkan dalam unit dasar
            const unitDasar = bahanBaku?.unit_dasar?.nama_unit || 'unit';
            return (
              <div className="font-medium text-gray-900 dark:text-white">
                {jumlah.toLocaleString('id-ID')} {unitDasar}
              </div>
            );
          }
        },
      },
      {
        accessorKey: "harga_beli",
        header: ({ column }) => (
          <SortableHeader column={column}>Harga</SortableHeader>
        ),
        cell: ({ row }) => (
          <div className="font-medium text-gray-900 dark:text-white">
            {formatCurrency(row.getValue("harga_beli"))}
          </div>
        ),
      },
      {
        accessorKey: "tanggal",
        header: ({ column }) => (
          <SortableHeader column={column}>Tanggal</SortableHeader>
        ),
        cell: ({ row }) => (
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {formatDateTime(row.getValue("tanggal"))}
          </div>
        ),
      },
      {
        id: "actions",
        header: "Aksi",
        cell: ({ row }) => (
          <ActionDropdown>
            <DropdownMenuItem onClick={() => router.push(`/dashboard/pembelian/detail/${row.original.id}`)}>
              <Eye className="mr-2 h-4 w-4" />
              Detail
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleEdit(row.original.id)}>
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => handleDelete(row.original)}
              className="text-red-600"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Hapus
            </DropdownMenuItem>
          </ActionDropdown>
        ),
      },
    ],
    []
  )

  const handleExport = async () => {
    try {
      const rows = data.map((item) => {
        const bahan = Array.isArray(item.bahan_baku) ? item.bahan_baku[0] : item.bahan_baku;
        const supplier = Array.isArray(item.suppliers) ? item.suppliers[0] : item.suppliers;
        const kemasan = Array.isArray(item.kemasan) ? item.kemasan[0] : item.kemasan;
        const unitDasar = kemasan?.unit_dasar?.nama_unit || bahan?.unit_dasar?.nama_unit || 'unit';
        const jumlahDisplay = kemasan
          ? `${(item.jumlah / (kemasan.nilai_konversi || 1)).toLocaleString('id-ID')} ${kemasan.nama_kemasan} (= ${item.jumlah.toLocaleString('id-ID')} ${unitDasar})`
          : `${item.jumlah.toLocaleString('id-ID')} ${unitDasar}`;
        return {
          'Bahan Baku': bahan?.nama_bahan_baku || '-',
          'Asal Barang': item.asal_barang === 'reservasi' ? 'Dari Reservasi' : 'Pembelian Langsung',
          Supplier: supplier?.nama_supplier || '-',
          Jumlah: jumlahDisplay,
          Harga: item.harga_beli || 0,
          Tanggal: new Date(item.tanggal).toLocaleString('id-ID'),
          Catatan: item.catatan || '-',
        };
      });

      await exportToXlsx('pembelian', {
        sheetName: 'Pembelian',
        columns: [
          { header: 'Bahan Baku', key: 'Bahan Baku', width: 28 },
          { header: 'Asal Barang', key: 'Asal Barang', width: 18 },
          { header: 'Supplier', key: 'Supplier', width: 26 },
          { header: 'Jumlah', key: 'Jumlah', width: 28 },
          { header: 'Harga', key: 'Harga', width: 16 },
          { header: 'Tanggal', key: 'Tanggal', width: 22 },
          { header: 'Catatan', key: 'Catatan', width: 36 },
        ],
        rows,
      });
      toast.success('Export pembelian berhasil');
    } catch (e) {
      console.error('Export pembelian gagal:', e);
      toast.error('Export gagal');
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
        // Use startDate and endDate from state
        break;
      }
    }
    if (preset !== 'custom' && start) {
      setStartDate(start.toISOString().split('T')[0]);
      setEndDate(new Date().toISOString().split('T')[0]);
      fetchPembelianData(start.toISOString(), end?.toISOString());
    } else if (preset === 'custom' && startDate && endDate) {
      const s = new Date(startDate);
      s.setHours(0, 0, 0, 0);
      const e = new Date(endDate);
      e.setHours(23, 59, 59, 999);
      fetchPembelianData(s.toISOString(), e.toISOString());
    } else {
      toast.info('Pilih tanggal mulai dan akhir untuk rentang kustom');
    }
  };

  const navbarActions = useMemo(() => [
    {
      label: "Tambah Pembelian",
      onClick: handleAdd,
      icon: Plus,
      variant: "default" as const
    },
    { label: "Export", onClick: handleExport, variant: "outline" as const },
    {
      label: "Filter",
      onClick: () => console.log('Filter'),
      variant: "outline" as const
    }
  ], [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <Navbar title="Pembelian" actions={navbarActions} />
      
      <div className="flex-1 p-4 md:p-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <StatCard
            title="Total Transaksi"
            value={totalTransaksi}
            subtitle="pembelian"
            icon={ShoppingCart}
            {...StatCardVariants.primary}
          />
          <StatCard
            title="Total Nilai"
            value={formatCurrency(totalPembelian)}
            subtitle="semua pembelian"
            icon={DollarSign}
            {...StatCardVariants.success}
          />
          <StatCard
            title="Bulan Ini"
            value={formatCurrency(thisMonthTotal)}
            subtitle="pembelian"
            icon={Calendar}
            {...StatCardVariants.purple}
          />
          <StatCard
            title="Rata-rata"
            value={formatCurrency(totalTransaksi > 0 ? totalPembelian / totalTransaksi : 0)}
            subtitle="per transaksi"
            icon={Package}
            {...StatCardVariants.warning}
          />
        </div>

        {/* Main Content */}
        <Card className="shadow-lg border-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
          <CardContent className="p-6">
            <DataTable
              columns={columns}
              data={data}
              searchKey="bahan_baku"
              searchPlaceholder="Cari bahan baku..."
              hideColumnToggle={true}
              extraControls={(
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
              )}
            />
          </CardContent>
        </Card>
      </div>

      <ConfirmationDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog(prev => ({ ...prev, open }))}
        title="Hapus Data Pembelian"
        description={`Apakah Anda yakin ingin menghapus data pembelian ${deleteDialog.pembelian?.bahan_baku?.nama_bahan_baku || 'ini'}? Tindakan ini tidak dapat dibatalkan.`}
        onConfirm={handleConfirmDelete}
        loading={deleteDialog.loading}
        confirmText="Hapus"
        cancelText="Batal"
      />
    </div>
  );
}
