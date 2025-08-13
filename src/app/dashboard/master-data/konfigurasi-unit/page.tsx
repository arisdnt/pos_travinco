'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DataTable, SortableHeader, ActionDropdown } from '@/components/ui/data-table';
import {
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { Navbar } from '@/components/layout/navbar';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { Plus, Ruler, Package, Eye, Edit, Trash2, Filter, BarChart3 } from 'lucide-react';
import { toast } from 'sonner';
import { formatDate } from '@/lib/utils';
import type { UnitDasar, Kemasan } from '@/types/master-data';
import type { ColumnDef } from '@tanstack/react-table';

export default function KonfigurasiUnitPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('unit-dasar');
  
  // Unit Dasar State
  const [unitData, setUnitData] = useState<UnitDasar[]>([]);
  const [unitLoading, setUnitLoading] = useState(true);
  const [unitSearchTerm, setUnitSearchTerm] = useState('');
  const [unitDeleting, setUnitDeleting] = useState<string | null>(null);
  const [unitDeleteDialog, setUnitDeleteDialog] = useState<{
    open: boolean;
    unit: UnitDasar | null;
    loading: boolean;
  }>({ open: false, unit: null, loading: false });
  
  // Kemasan State
  const [kemasanData, setKemasanData] = useState<Kemasan[]>([]);
  const [kemasanLoading, setKemasanLoading] = useState(true);
  const [kemasanSearchTerm, setKemasanSearchTerm] = useState('');
  const [kemasanDeleting, setKemasanDeleting] = useState<string | null>(null);
  const [kemasanDeleteDialog, setKemasanDeleteDialog] = useState<{
    open: boolean;
    kemasan: Kemasan | null;
    loading: boolean;
  }>({ open: false, kemasan: null, loading: false });

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
        console.error('Error fetching unit dasars:', error);
        toast.error('Gagal memuat data unit dasar');
        return;
      }

      const units = data || [];
      setUnitData(units);
    } catch (error) {
      console.error('Error in fetchUnitData:', error);
      toast.error('Terjadi kesalahan saat memuat data');
    } finally {
      setUnitLoading(false);
    }
  };

  const fetchKemasanData = async () => {
    try {
      setKemasanLoading(true);
      const supabase = createClient();
      
      let query = supabase
        .from('kemasan')
        .select(`
          *,
          unit_dasar:unit_dasar_id(nama_unit)
        `)
        .order('created_at', { ascending: false });

      if (kemasanSearchTerm) {
        query = query.ilike('nama_kemasan', `%${kemasanSearchTerm}%`);
      }

      const { data, error } = await query;
      
      if (error) {
        console.error('Error fetching kemasans:', error);
        toast.error('Gagal memuat data kemasan');
        return;
      }

      const kemasans = data || [];
      setKemasanData(kemasans);
    } catch (error) {
      console.error('Error in fetchKemasanData:', error);
      toast.error('Terjadi kesalahan saat memuat data');
    } finally {
      setKemasanLoading(false);
    }
  };

  const handleAddUnit = () => {
    router.push('/dashboard/master-data/konfigurasi-unit/unit-dasar/add');
  };

  const handleEditUnit = (id: string) => {
    router.push(`/dashboard/master-data/konfigurasi-unit/unit-dasar/${id}/edit`);
  };

  const handleDeleteUnit = useCallback((unit: UnitDasar) => {
    setUnitDeleteDialog({ open: true, unit, loading: false });
  }, []);

  const handleConfirmDeleteUnit = useCallback(async () => {
    if (!unitDeleteDialog.unit) return;

    try {
      setUnitDeleteDialog(prev => ({ ...prev, loading: true }));
      const supabase = createClient();
      
      const { error } = await supabase
        .from('unit_dasar')
        .delete()
        .eq('id', unitDeleteDialog.unit.id);

      if (error) {
        console.error('Error deleting unit dasar:', error);
        if (error.code === '23503') {
          toast.error('Unit dasar tidak dapat dihapus karena masih digunakan oleh data lain');
        } else {
          toast.error('Gagal menghapus unit dasar');
        }
        return;
      }

      toast.success('Unit dasar berhasil dihapus');
      setUnitDeleteDialog({ open: false, unit: null, loading: false });
      await fetchUnitData();
    } catch (error) {
      console.error('Error in handleConfirmDeleteUnit:', error);
      toast.error('Terjadi kesalahan saat menghapus data');
    } finally {
      setUnitDeleteDialog(prev => ({ ...prev, loading: false }));
    }
  }, [unitDeleteDialog.unit, fetchUnitData]);

  const handleAddKemasan = () => {
    router.push('/dashboard/master-data/konfigurasi-unit/kemasan/add');
  };

  const handleEditKemasan = (id: string) => {
    router.push(`/dashboard/master-data/konfigurasi-unit/kemasan/${id}/edit`);
  };

  const handleDeleteKemasan = useCallback((kemasan: Kemasan) => {
    setKemasanDeleteDialog({ open: true, kemasan, loading: false });
  }, []);

  const handleConfirmDeleteKemasan = useCallback(async () => {
    if (!kemasanDeleteDialog.kemasan) return;

    try {
      setKemasanDeleteDialog(prev => ({ ...prev, loading: true }));
      const supabase = createClient();
      
      const { error } = await supabase
        .from('kemasan')
        .delete()
        .eq('id', kemasanDeleteDialog.kemasan.id);

      if (error) {
        console.error('Error deleting kemasan:', error);
        if (error.code === '23503') {
          toast.error('Kemasan tidak dapat dihapus karena masih digunakan oleh data lain');
        } else {
          toast.error('Gagal menghapus kemasan');
        }
        return;
      }

      toast.success('Kemasan berhasil dihapus');
      setKemasanDeleteDialog({ open: false, kemasan: null, loading: false });
      await fetchKemasanData();
    } catch (error) {
      console.error('Error in handleConfirmDeleteKemasan:', error);
      toast.error('Terjadi kesalahan saat menghapus data');
    } finally {
      setKemasanDeleteDialog(prev => ({ ...prev, loading: false }));
    }
  }, [kemasanDeleteDialog.kemasan, fetchKemasanData]);

  useEffect(() => {
    fetchUnitData();
  }, [unitSearchTerm]);

  useEffect(() => {
    fetchKemasanData();
  }, [kemasanSearchTerm]);

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
      cell: ({ row }) => {
        const item = row.original
        return (
          <ActionDropdown>
            <DropdownMenuItem 
              onClick={() => router.push(`/dashboard/master-data/konfigurasi-unit/unit-dasar/${item.id}`)}
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
              onClick={() => handleDeleteUnit(item)}
              className="text-red-600"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Hapus
            </DropdownMenuItem>
          </ActionDropdown>
        )
      },
    },
  ], [router, unitDeleting]);

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
      cell: ({ row }) => {
        const item = row.original
        return (
          <ActionDropdown>
            <DropdownMenuItem 
              onClick={() => router.push(`/dashboard/master-data/konfigurasi-unit/kemasan/${item.id}`)}
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
              onClick={() => handleDeleteKemasan(item)}
              className="text-red-600"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Hapus
            </DropdownMenuItem>
          </ActionDropdown>
        )
      },
    },
  ], [router, kemasanDeleting]);

  // Define navbar actions for Unit Dasar
  const unitNavbarActions = useMemo(() => [
    {
      label: 'Tambah Unit Dasar',
      onClick: handleAddUnit,
      icon: Plus,
      variant: 'default' as const
    },
    {
      label: 'Export Data',
      onClick: () => {
        // TODO: Implement export functionality
        toast.info('Fitur export akan segera tersedia');
      },
      icon: BarChart3,
      variant: 'outline' as const
    },
    {
      label: 'Filter Lanjutan',
      onClick: () => {
        // TODO: Implement advanced filter
        toast.info('Fitur filter lanjutan akan segera tersedia');
      },
      icon: Filter,
      variant: 'outline' as const
    }
  ], []);

  // Define navbar actions for Kemasan
  const kemasanNavbarActions = useMemo(() => [
    {
      label: 'Tambah Kemasan',
      onClick: handleAddKemasan,
      icon: Plus,
      variant: 'default' as const
    },
    {
      label: 'Export Data',
      onClick: () => {
        // TODO: Implement export functionality
        toast.info('Fitur export akan segera tersedia');
      },
      icon: BarChart3,
      variant: 'outline' as const
    },
    {
      label: 'Filter Lanjutan',
      onClick: () => {
        // TODO: Implement advanced filter
        toast.info('Fitur filter lanjutan akan segera tersedia');
      },
      icon: Filter,
      variant: 'outline' as const
    }
  ], []);

  return (
    <div className="flex flex-col h-full">
      <Navbar 
        title="Konfigurasi Unit" 
        actions={[]}
      />
      <div className="flex-1 p-4 md:p-6 space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="unit-dasar" className="flex items-center space-x-2">
              <Ruler className="h-4 w-4" />
              <span>Unit Dasar</span>
            </TabsTrigger>
            <TabsTrigger value="kemasan" className="flex items-center space-x-2">
              <Package className="h-4 w-4" />
              <span>Kemasan</span>
            </TabsTrigger>
          </TabsList>

        <TabsContent value="unit-dasar" className="space-y-6">
          <Navbar
            title="Unit Dasar"
            actions={unitNavbarActions}
          />
          


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
        </TabsContent>

        <TabsContent value="kemasan" className="space-y-6">
          <Navbar
            title="Kemasan"
            actions={kemasanNavbarActions}
          />
          


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
        </TabsContent>
      </Tabs>
      </div>

      {/* Unit Dasar Delete Confirmation Dialog */}
      <ConfirmationDialog
        open={unitDeleteDialog.open}
        onOpenChange={(open) => setUnitDeleteDialog(prev => ({ ...prev, open }))}
        title="Hapus Unit Dasar"
        description={`Apakah Anda yakin ingin menghapus unit dasar "${unitDeleteDialog.unit?.nama_unit}"? Tindakan ini tidak dapat dibatalkan.`}
        confirmText="Hapus"
        cancelText="Batal"
        variant="destructive"
        onConfirm={handleConfirmDeleteUnit}
        loading={unitDeleteDialog.loading}
      />

      {/* Kemasan Delete Confirmation Dialog */}
      <ConfirmationDialog
        open={kemasanDeleteDialog.open}
        onOpenChange={(open) => setKemasanDeleteDialog(prev => ({ ...prev, open }))}
        title="Hapus Kemasan"
        description={`Apakah Anda yakin ingin menghapus kemasan "${kemasanDeleteDialog.kemasan?.nama_kemasan}"? Tindakan ini tidak dapat dibatalkan.`}
        confirmText="Hapus"
        cancelText="Batal"
        variant="destructive"
        onConfirm={handleConfirmDeleteKemasan}
        loading={kemasanDeleteDialog.loading}
      />
    </div>
  );
}