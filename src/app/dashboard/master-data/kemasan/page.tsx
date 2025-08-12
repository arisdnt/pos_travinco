'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent } from '@/components/ui/card'
import { DataTable, SortableHeader, ActionDropdown } from '@/components/ui/data-table';
import {
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { Navbar } from '@/components/layout/navbar';
import { StatCard, StatCardVariants } from '@/components/ui/stat-card';
import { Plus, Package, Eye, Edit, Trash2, BarChart3, TrendingUp, Ruler, Calculator } from 'lucide-react';
import { toast } from 'sonner';
import { formatDate } from '@/lib/utils';
import type { Kemasan } from '@/types/master-data';
import type { ColumnDef } from '@tanstack/react-table';

interface KemasanStats {
  totalKemasan: number;
  uniqueUnits: number;
  avgKonversi: number;
  totalPembelian: number;
}

export default function KemasanPage() {
  const router = useRouter();
  
  // Kemasan State
  const [kemasanData, setKemasanData] = useState<Kemasan[]>([]);
  const [kemasanLoading, setKemasanLoading] = useState(true);
  const [kemasanSearchTerm, setKemasanSearchTerm] = useState('');
  const [kemasanDeleting, setKemasanDeleting] = useState<string | null>(null);
  const [stats, setStats] = useState<KemasanStats>({
    totalKemasan: 0,
    uniqueUnits: 0,
    avgKonversi: 0,
    totalPembelian: 0
  });

  const fetchKemasanData = async () => {
    try {
      setKemasanLoading(true);
      const supabase = createClient();
      
      let query = supabase
        .from('kemasan')
        .select(`
          *,
          unit_dasar (
            id,
            nama_unit,
            deskripsi
          )
        `)
        .order('created_at', { ascending: false });

      if (kemasanSearchTerm) {
        query = query.ilike('nama_kemasan', `%${kemasanSearchTerm}%`);
      }

      const { data, error } = await query;
      
      if (error) {
        console.error('Error fetching kemasan data:', error);
        toast.error('Gagal memuat data kemasan');
        return;
      }

      setKemasanData(data || []);
      
      // Fetch statistics
      await fetchStats();
    } catch (error) {
      console.error('Error in fetchKemasanData:', error);
      toast.error('Terjadi kesalahan saat memuat data');
    } finally {
      setKemasanLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const supabase = createClient();
      
      // Get total kemasan
      const { count: totalKemasan } = await supabase
        .from('kemasan')
        .select('*', { count: 'exact', head: true });
      
      // Get unique units used
      const { data: uniqueUnitsData } = await supabase
        .from('kemasan')
        .select('unit_dasar_id')
        .not('unit_dasar_id', 'is', null);
      
      const uniqueUnits = new Set(uniqueUnitsData?.map(item => item.unit_dasar_id) || []).size;
      
      // Get average conversion value
      const { data: konversiData } = await supabase
        .from('kemasan')
        .select('nilai_konversi');
      
      const avgKonversi = konversiData && konversiData.length > 0 
        ? konversiData.reduce((sum, item) => sum + (item.nilai_konversi || 0), 0) / konversiData.length
        : 0;
      
      // Get total pembelian using kemasan
      const { count: totalPembelian } = await supabase
        .from('pembelian')
        .select('*', { count: 'exact', head: true })
        .not('kemasan_id', 'is', null);
      
      setStats({
        totalKemasan: totalKemasan || 0,
        uniqueUnits,
        avgKonversi: Math.round(avgKonversi * 100) / 100,
        totalPembelian: totalPembelian || 0
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  useEffect(() => {
    fetchKemasanData();
  }, [kemasanSearchTerm]);

  const handleEditKemasan = (id: string) => {
    router.push(`/dashboard/master-data/konfigurasi-unit/kemasan/${id}/edit`);
  };

  const handleDeleteKemasan = async (id: string, nama: string) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus kemasan "${nama}"?`)) {
      return;
    }

    try {
      setKemasanDeleting(id);
      const supabase = createClient();
      
      const { error } = await supabase
        .from('kemasan')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting kemasan:', error);
        toast.error('Gagal menghapus kemasan');
        return;
      }

      toast.success('Kemasan berhasil dihapus');
      fetchKemasanData();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Terjadi kesalahan saat menghapus data');
    } finally {
      setKemasanDeleting(null);
    }
  };

  // Define navbar actions for Kemasan
  const kemasanNavbarActions = [
    {
      label: 'Tambah Kemasan',
      onClick: () => router.push('/dashboard/master-data/konfigurasi-unit/kemasan/add'),
      icon: Plus,
      variant: 'default' as const,
    },
  ];

  // Define columns for Kemasan table
  const kemasanColumns: ColumnDef<Kemasan>[] = useMemo(() => [
    {
      accessorKey: 'nama_kemasan',
      header: ({ column }) => (
        <SortableHeader column={column}>Nama Kemasan</SortableHeader>
      ),
      cell: ({ row }) => (
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/20">
            <Package className="h-4 w-4 text-orange-600 dark:text-orange-400" />
          </div>
          <div>
            <div className="font-medium text-gray-900 dark:text-white">
              {row.original.nama_kemasan}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {row.original.nilai_konversi} {row.original.unit_dasar?.nama_unit || ''}
            </div>
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'unit_dasar.nama_unit',
      header: ({ column }) => (
        <SortableHeader column={column}>Unit Dasar</SortableHeader>
      ),
      cell: ({ row }) => (
        <span className="text-sm text-gray-900 dark:text-white">
          {row.original.unit_dasar?.nama_unit || 'N/A'}
        </span>
      ),
    },
    {
      accessorKey: 'nilai_konversi',
      header: ({ column }) => (
        <SortableHeader column={column}>Konversi</SortableHeader>
      ),
      cell: ({ row }) => (
        <div className="text-sm">
          <div className="text-gray-900 dark:text-white font-medium">
            1 {row.original.nama_kemasan}
          </div>
          <div className="text-gray-600 dark:text-gray-400">
            = {row.original.nilai_konversi} {row.original.unit_dasar?.nama_unit || ''}
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'created_at',
      header: ({ column }) => (
        <SortableHeader column={column}>Tanggal Dibuat</SortableHeader>
      ),
      cell: ({ row }) => (
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {row.original.created_at ? formatDate(row.original.created_at) : 'N/A'}
        </span>
      ),
    },
    {
      id: 'actions',
      header: 'Aksi',
      enableHiding: false,
      cell: ({ row }) => {
        const item = row.original
        return (
          <ActionDropdown>
            <DropdownMenuItem 
              onClick={() => router.push(`/dashboard/master-data/kemasan/${item.id}`)}
            >
              <Eye className="mr-2 h-4 w-4" />
              Lihat Detail
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => handleEditKemasan(item.id)}
            >
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => handleDeleteKemasan(item.id, item.nama_kemasan)}
              className="text-red-600"
              disabled={kemasanDeleting === item.id}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {kemasanDeleting === item.id ? 'Menghapus...' : 'Hapus'}
            </DropdownMenuItem>
          </ActionDropdown>
        )
      },
    },
  ], [router, kemasanDeleting]);

  return (
    <div className="flex flex-col h-full">
      <Navbar 
        title="Kemasan" 
        actions={kemasanNavbarActions}
      />
      <div className="flex-1 p-4 md:p-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Kemasan"
            value={stats.totalKemasan.toString()}
            subtitle="jenis kemasan"
            icon={Package}
            {...StatCardVariants.primary}
          />
          <StatCard
            title="Unit Berbeda"
            value={stats.uniqueUnits.toString()}
            subtitle="unit dasar digunakan"
            icon={Ruler}
            {...StatCardVariants.success}
          />
          <StatCard
            title="Rata-rata Konversi"
            value={stats.avgKonversi.toString()}
            subtitle="nilai konversi"
            icon={Calculator}
            {...StatCardVariants.warning}
          />
          <StatCard
            title="Pembelian Terkait"
            value={stats.totalPembelian.toString()}
            subtitle="transaksi pembelian"
            icon={TrendingUp}
            {...StatCardVariants.purple}
          />
        </div>

        <Card className="shadow-lg border-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
          <CardContent className="p-6">
            <DataTable
              columns={kemasanColumns}
              data={kemasanData}
              searchKey="nama_kemasan"
              searchPlaceholder="Cari kemasan..."
              hideColumnToggle={true}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}