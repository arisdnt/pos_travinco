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
import { Plus, Ruler, Eye, Edit, Trash2, Package, BarChart3, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import { formatDate } from '@/lib/utils';
import type { UnitDasar } from '@/types/master-data';
import type { ColumnDef } from '@tanstack/react-table';

interface UnitDasarStats {
  totalUnits: number;
  unitsWithDescription: number;
  totalBahanBaku: number;
  totalKemasan: number;
}

export default function UnitDasarPage() {
  const router = useRouter();
  
  // Unit Dasar State
  const [unitData, setUnitData] = useState<UnitDasar[]>([]);
  const [unitLoading, setUnitLoading] = useState(true);
  const [unitSearchTerm, setUnitSearchTerm] = useState('');
  const [unitDeleting, setUnitDeleting] = useState<string | null>(null);
  const [stats, setStats] = useState<UnitDasarStats>({
    totalUnits: 0,
    unitsWithDescription: 0,
    totalBahanBaku: 0,
    totalKemasan: 0
  });

  const fetchUnitData = async () => {
    try {
      setUnitLoading(true);
      const supabase = createClient();
      
      let query = supabase
        .from('unit_dasar')
        .select('*')
        .order('created_at', { ascending: false });

      if (unitSearchTerm) {
        query = query.ilike('nama_unit', `%${unitSearchTerm}%`);
      }

      const { data, error } = await query;
      
      if (error) {
        console.error('Error fetching unit dasar:', error);
        toast.error('Gagal memuat data unit dasar');
        return;
      }

      setUnitData(data || []);
      
      // Fetch statistics
      await fetchStats();
    } catch (error) {
      console.error('Error in fetchUnitData:', error);
      toast.error('Terjadi kesalahan saat memuat data');
    } finally {
      setUnitLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const supabase = createClient();
      
      // Get total units
      const { count: totalUnits } = await supabase
        .from('unit_dasar')
        .select('*', { count: 'exact', head: true });
      
      // Get units with description
      const { count: unitsWithDescription } = await supabase
        .from('unit_dasar')
        .select('*', { count: 'exact', head: true })
        .not('deskripsi', 'is', null)
        .neq('deskripsi', '');
      
      // Get total bahan baku using this unit
      const { count: totalBahanBaku } = await supabase
        .from('bahan_baku')
        .select('*', { count: 'exact', head: true })
        .not('unit_dasar_id', 'is', null);
      
      // Get total kemasan using this unit
      const { count: totalKemasan } = await supabase
        .from('kemasan')
        .select('*', { count: 'exact', head: true });
      
      setStats({
        totalUnits: totalUnits || 0,
        unitsWithDescription: unitsWithDescription || 0,
        totalBahanBaku: totalBahanBaku || 0,
        totalKemasan: totalKemasan || 0
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  useEffect(() => {
    fetchUnitData();
  }, [unitSearchTerm]);

  const handleEditUnit = (id: string) => {
    router.push(`/dashboard/master-data/konfigurasi-unit/unit-dasar/${id}/edit`);
  };

  const handleDeleteUnit = async (id: string, nama: string) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus unit dasar "${nama}"?`)) {
      return;
    }

    try {
      setUnitDeleting(id);
      const supabase = createClient();
      
      const { error } = await supabase
        .from('unit_dasar')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting unit:', error);
        toast.error('Gagal menghapus unit dasar');
        return;
      }

      toast.success('Unit dasar berhasil dihapus');
      fetchUnitData();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Terjadi kesalahan saat menghapus data');
    } finally {
      setUnitDeleting(null);
    }
  };

  // Define navbar actions for Unit Dasar
  const unitNavbarActions = [
    {
      label: 'Tambah Unit Dasar',
      onClick: () => router.push('/dashboard/master-data/konfigurasi-unit/unit-dasar/add'),
      icon: Plus,
      variant: 'default' as const,
    },
  ];

  // Define columns for Unit Dasar table
  const unitColumns: ColumnDef<UnitDasar>[] = useMemo(() => [
    {
      accessorKey: 'nama_unit',
      header: ({ column }) => (
        <SortableHeader column={column}>Nama Unit</SortableHeader>
      ),
      cell: ({ row }) => (
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/20">
            <Ruler className="h-4 w-4 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <div className="font-medium text-gray-900 dark:text-white">
              {row.original.nama_unit}
            </div>
            {row.original.deskripsi && (
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {row.original.deskripsi}
              </div>
            )}
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'deskripsi',
      header: ({ column }) => (
        <SortableHeader column={column}>Deskripsi</SortableHeader>
      ),
      cell: ({ row }) => (
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {row.original.deskripsi || '-'}
        </span>
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
              onClick={() => router.push(`/dashboard/master-data/unit-dasar/${item.id}`)}
            >
              <Eye className="mr-2 h-4 w-4" />
              Lihat Detail
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => handleEditUnit(item.id)}
            >
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => handleDeleteUnit(item.id, item.nama_unit)}
              className="text-red-600"
              disabled={unitDeleting === item.id}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {unitDeleting === item.id ? 'Menghapus...' : 'Hapus'}
            </DropdownMenuItem>
          </ActionDropdown>
        )
      },
    },
  ], [router, unitDeleting]);

  return (
    <div className="flex flex-col h-full">
      <Navbar 
        title="Unit Dasar" 
        actions={unitNavbarActions}
      />
      <div className="flex-1 p-4 md:p-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Unit Dasar"
            value={stats.totalUnits.toString()}
            subtitle="unit pengukuran"
            icon={Ruler}
            {...StatCardVariants.primary}
          />
          <StatCard
            title="Unit Terdeskripsi"
            value={stats.unitsWithDescription.toString()}
            subtitle="memiliki deskripsi"
            icon={BarChart3}
            {...StatCardVariants.success}
          />
          <StatCard
            title="Bahan Baku Terkait"
            value={stats.totalBahanBaku.toString()}
            subtitle="menggunakan unit ini"
            icon={Package}
            {...StatCardVariants.warning}
          />
          <StatCard
            title="Kemasan Terkait"
            value={stats.totalKemasan.toString()}
            subtitle="berbasis unit ini"
            icon={TrendingUp}
            {...StatCardVariants.purple}
          />
        </div>

        <Card className="shadow-lg border-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
          <CardContent className="p-6">
            <DataTable
              columns={unitColumns}
              data={unitData}
              searchKey="nama_unit"
              searchPlaceholder="Cari unit dasar..."
              hideColumnToggle={true}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}