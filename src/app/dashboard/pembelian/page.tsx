'use client';

import { useState, useMemo, useEffect } from 'react';
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





export default function PembelianPage() {
  const router = useRouter();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('🚀 Component mounted, memulai fetch data...');
    fetchPembelianData();
  }, []);

  // Log perubahan data
  useEffect(() => {
    console.log('📈 Data pembelian berubah:', {
      count: data.length,
      items: data.slice(0, 3) // Log 3 item pertama untuk debugging
    });
  }, [data]);

  const fetchPembelianData = async () => {
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
      let { data: pembelianData, error } = await supabase
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
        .eq('user_id', user.id)
        .order('tanggal', { ascending: false });

      console.log('📊 Query result untuk user pembelian:', {
        data: pembelianData,
        error: error,
        count: pembelianData?.length || 0
      });

      // If no data found with user_id, try without user_id filter (for sample data)
      if (!error && (!pembelianData || pembelianData.length === 0)) {
        console.log('⚠️ Tidak ada data user, mencoba mengambil data sampel...');
        
        const { data: sampleData, error: sampleError } = await supabase
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
          .order('tanggal', { ascending: false });
        
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

  const handleDelete = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus data pembelian ini?')) {
      return;
    }

    try {
      console.log('🗑️ Menghapus pembelian dengan id:', id);
      
      const { error } = await supabase
        .from('pembelian')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('❌ Error deleting pembelian:', error);
        throw error;
      }

      console.log('✅ Pembelian berhasil dihapus');
      toast.success('Data pembelian berhasil dihapus');
      fetchPembelianData();
    } catch (error) {
      console.error('💥 Error deleting pembelian:', error);
      toast.error('Gagal menghapus data pembelian');
    }
  };

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
              onClick={() => handleDelete(row.original.id)}
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

  const navbarActions = useMemo(() => [
    {
      label: "Tambah Pembelian",
      onClick: handleAdd,
      icon: Plus,
      variant: "default" as const
    },
    {
      label: "Download",
      onClick: () => console.log('Download'),
      variant: "outline" as const
    },
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

        <Card>
          <CardContent>
            <DataTable
              columns={columns}
              data={data}
              searchKey="bahan_baku.nama_bahan_baku"
              searchPlaceholder="Cari bahan baku..."
              hideColumnToggle={true}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}