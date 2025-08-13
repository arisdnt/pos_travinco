'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BookOpen, Beaker, Package, Calculator, ChefHat, Layers, MoreHorizontal, Clock, DollarSign, Plus, Edit, Trash2, Eye } from 'lucide-react';
import { StatCard, StatCardVariants } from '@/components/ui/stat-card';
import { DataTable, SortableHeader, ActionDropdown } from '@/components/ui/data-table';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Navbar, createNavbarActions } from '@/components/layout/navbar';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { formatCurrency, formatDate } from '@/lib/utils';
import { toast } from 'sonner';



const getCategoryColor = (kategori: string) => {
  switch (kategori) {
    case 'Base':
      return 'bg-blue-100 text-blue-800 border-blue-200'
    case 'Fragrance':
      return 'bg-purple-100 text-purple-800 border-purple-200'
    case 'Additive':
      return 'bg-green-100 text-green-800 border-green-200'
    case 'Preservative':
      return 'bg-orange-100 text-orange-800 border-orange-200'
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200'
  }
}



export default function ResepPage() {
  const router = useRouter();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean
    resep: any | null
    loading: boolean
  }>({
    open: false,
    resep: null,
    loading: false
  })

  useEffect(() => {
    fetchResepData();
  }, []);

  const fetchResepData = async () => {
    try {
      // Ambil data resep yang sudah dikelompokkan berdasarkan produk_jadi_id
      const { data: resepData, error } = await supabase
        .from('resep')
        .select(`
          produk_jadi_id,
          produk_jadi:produk_jadi_id(nama_produk_jadi, harga_jual, sku, created_at),
          bahan_baku:bahan_baku_id(
            nama_bahan_baku,
            unit_dasar:unit_dasar_id(nama_unit)
          ),
          jumlah_dibutuhkan
        `);

      if (error) throw error;

      // Kelompokkan data berdasarkan produk_jadi_id
      const groupedData = resepData?.reduce((acc: any[], item: any) => {
        const existingProduct = acc.find(p => p.produk_jadi_id === item.produk_jadi_id);
        
        if (existingProduct) {
          existingProduct.bahan_baku_list.push({
            nama: item.bahan_baku?.nama_bahan_baku,
            jumlah: item.jumlah_dibutuhkan,
            unit: item.bahan_baku?.unit_dasar?.nama_unit || 'unit'
          });
          existingProduct.jumlah_bahan_baku += 1;
        } else {
          acc.push({
            produk_jadi_id: item.produk_jadi_id,
            nama_produk_jadi: item.produk_jadi?.nama_produk_jadi,
            harga_jual: item.produk_jadi?.harga_jual,
            sku: item.produk_jadi?.sku,
            created_at: item.produk_jadi?.created_at,
            jumlah_bahan_baku: 1,
            bahan_baku_list: [{
              nama: item.bahan_baku?.nama_bahan_baku,
              jumlah: item.jumlah_dibutuhkan,
              unit: item.bahan_baku?.unit_dasar?.nama_unit || 'unit'
            }]
          });
        }
        return acc;
      }, []) || [];

      // Urutkan data berdasarkan created_at (terbaru di atas)
      const sortedData = groupedData.sort((a, b) => {
        const dateA = new Date(a.created_at || 0).getTime();
        const dateB = new Date(b.created_at || 0).getTime();
        return dateB - dateA; // Descending order (terbaru di atas)
      });

      setData(sortedData);
    } catch (error) {
      console.error('Error fetching resep data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = useCallback((produkJadiId: string) => {
    const resep = data.find(d => d.produk_jadi_id === produkJadiId);
    if (!resep) return;
    
    setDeleteDialog({
      open: true,
      resep: resep,
      loading: false
    });
  }, [data]);

  const handleConfirmDelete = async () => {
    if (!deleteDialog.resep) return;

    setDeleteDialog(prev => ({ ...prev, loading: true }));

    try {
      const { error } = await supabase
        .from('resep')
        .delete()
        .eq('produk_jadi_id', deleteDialog.resep.produk_jadi_id);

      if (error) throw error;

      toast.success('Resep berhasil dihapus!');
      setDeleteDialog({ open: false, resep: null, loading: false });
      fetchResepData(); // Refresh data
    } catch (error: any) {
      console.error('Error deleting resep:', error);
      toast.error(error.message || 'Gagal menghapus resep');
    } finally {
      setDeleteDialog(prev => ({ ...prev, loading: false }));
    }
  };

  const filteredData = data.filter(item => {
    const matchesSearch = searchTerm === '' ||
      item.nama_produk_jadi?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.bahan_baku_list?.some((bahan: any) => 
        bahan.nama?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    return matchesSearch
  })

  const totalResep = data.length;
  const uniqueProducts = data.length;
  const uniqueIngredients = Array.from(new Set(
    data.flatMap(item => item.bahan_baku_list?.map((bahan: any) => bahan.nama) || [])
  )).length;
  const totalIngredients = data.reduce((sum, item) => sum + (item.jumlah_bahan_baku || 0), 0);
  const avgIngredientsPerRecipe = uniqueProducts > 0 ? totalIngredients / uniqueProducts : 0;

  const columns = useMemo<ColumnDef<any>[]>(
    () => [
      {
        accessorKey: "nama_produk_jadi",
        header: ({ column }) => (
          <SortableHeader column={column}>Produk</SortableHeader>
        ),
        cell: ({ row }) => (
          <div>
            <div className="font-medium text-gray-900 dark:text-white">
              {row.original.nama_produk_jadi || '-'}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              SKU: {row.original.sku || '-'}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Harga: {formatCurrency(row.original.harga_jual || 0)}
            </div>
          </div>
        ),
      },
      {
        accessorKey: "jumlah_bahan_baku",
        header: "Jumlah Bahan",
        cell: ({ row }) => (
          <div className="font-medium text-gray-900 dark:text-white">
            {row.original.jumlah_bahan_baku || 0} bahan
          </div>
        ),
      },
      {
        accessorKey: "bahan_baku_list",
        header: "Komposisi",
        cell: ({ row }) => (
          <div className="max-w-xs">
            {row.original.bahan_baku_list?.slice(0, 3).map((bahan: any, index: number) => (
              <div key={index} className="text-sm text-gray-600 dark:text-gray-400">
                {bahan.nama}: <span className="text-red-600 font-medium">{bahan.jumlah}</span> <span className="text-red-600 font-medium">{bahan.unit}</span>
              </div>
            ))}
            {row.original.bahan_baku_list?.length > 3 && (
              <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                +{row.original.bahan_baku_list.length - 3} bahan lainnya
              </div>
            )}
          </div>
        ),
      },

      {
        id: "actions",
        header: "Aksi",
        cell: ({ row }) => (
          <ActionDropdown>
            <DropdownMenuItem 
              onClick={() => handleDetail(row.original.produk_jadi_id)}
            >
              <Eye className="mr-2 h-4 w-4" />
              Detail
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => handleEdit(row.original.produk_jadi_id)}
            >
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => handleDelete(row.original.produk_jadi_id)}
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

  const handleAdd = () => {
    router.push('/dashboard/resep/add');
  };

  const handleEdit = (id: string) => {
    router.push(`/dashboard/resep/edit/${id}`);
  };

  const handleDetail = (id: string) => {
    router.push(`/dashboard/resep/detail/${id}`);
  };

  const navbarActions = useMemo(() => [
    {
      label: "Tambah Resep",
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
  ], []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <span>Memuat data resep...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <Navbar 
        title="Resep" 
        actions={navbarActions}
      />
      <div className="flex-1 p-4 md:p-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Resep"
            value={totalResep}
            subtitle="resep tersedia"
            icon={BookOpen}
            {...StatCardVariants.primary}
          />
          <StatCard
            title="Produk Unik"
            value={uniqueProducts}
            subtitle="produk berbeda"
            icon={Package}
            {...StatCardVariants.purple}
          />
          <StatCard
            title="Bahan Baku"
            value={uniqueIngredients}
            subtitle="bahan berbeda"
            icon={Beaker}
            {...StatCardVariants.success}
          />
          <StatCard
            title="Rata-rata Bahan"
            value={avgIngredientsPerRecipe.toFixed(1)}
            subtitle="per resep"
            icon={Calculator}
            {...StatCardVariants.warning}
          />
        </div>

        {/* Main Content */}
        <Card className="shadow-lg border-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
          <CardContent className="p-6">
            <DataTable 
              columns={columns} 
              data={filteredData} 
              searchKey="nama_produk_jadi"
              searchPlaceholder="Cari produk atau bahan baku..."
              hideColumnToggle={true}
            />
          </CardContent>
        </Card>
      </div>

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog(prev => ({ ...prev, open }))}
        title="Hapus Resep"
        description={`Apakah Anda yakin ingin menghapus seluruh resep untuk produk "${deleteDialog.resep?.nama_produk_jadi}"? Tindakan ini tidak dapat dibatalkan.`}
        confirmText="Hapus"
        cancelText="Batal"
        variant="destructive"
        onConfirm={handleConfirmDelete}
        loading={deleteDialog.loading}
      />
    </div>
  );
}