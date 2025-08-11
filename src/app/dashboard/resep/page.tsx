'use client';

import { useState, useMemo, useEffect } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BookOpen, Beaker, Package, Calculator, ChefHat, Layers, MoreHorizontal, Clock, DollarSign, Plus, Edit, Trash2, Eye } from 'lucide-react';
import { StatCard, StatCardVariants } from '@/components/ui/stat-card';
import { DataTable, SortableHeader, ActionDropdown } from '@/components/ui/data-table';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Navbar, createNavbarActions } from '@/components/layout/navbar';
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

  useEffect(() => {
    fetchResepData();
  }, []);

  const fetchResepData = async () => {
    try {
      const { data: resepData, error } = await supabase
        .from('resep')
        .select(`
          *,
          produk_jadi:produk_jadi_id(nama_produk_jadi, harga_jual),
          bahan_baku:bahan_baku_id(nama_bahan_baku, unit)
        `);

      if (error) throw error;
      setData(resepData || []);
    } catch (error) {
      console.error('Error fetching resep data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = window.confirm('Apakah Anda yakin ingin menghapus resep ini?');
    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from('resep')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Resep berhasil dihapus!');
      fetchResepData(); // Refresh data
    } catch (error: any) {
      console.error('Error deleting resep:', error);
      toast.error(error.message || 'Gagal menghapus resep');
    }
  };

  const filteredData = data.filter(item => {
    const matchesSearch = searchTerm === '' ||
      item.produk_jadi?.nama_produk_jadi?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.bahan_baku?.nama_bahan_baku?.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesSearch
  })

  const totalResep = data.length;
  const uniqueProducts = Array.from(new Set(data.map(item => item.produk_jadi?.nama_produk_jadi))).length;
    const uniqueIngredients = Array.from(new Set(data.map(item => item.bahan_baku?.nama_bahan_baku))).length;
  const totalIngredients = data.reduce((sum, item) => sum + (item.jumlah_dibutuhkan || 0), 0);
  const avgIngredientsPerRecipe = uniqueProducts > 0 ? totalIngredients / uniqueProducts : 0;

  const columns = useMemo<ColumnDef<any>[]>(
    () => [
      {
        accessorKey: "produk_jadi",
        header: ({ column }) => (
          <SortableHeader column={column}>Produk</SortableHeader>
        ),
        cell: ({ row }) => (
          <div>
            <div className="font-medium text-gray-900 dark:text-white">
              {row.original.produk_jadi?.nama_produk_jadi || '-'}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Harga: {formatCurrency(row.original.produk_jadi?.harga_jual || 0)}
            </div>
          </div>
        ),
      },
      {
        accessorKey: "bahan_baku",
        header: "Bahan Baku",
        cell: ({ row }) => (
          <div>
            <div className="font-medium text-gray-900 dark:text-white">
              {row.original.bahan_baku?.nama_bahan_baku || '-'}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Unit: {row.original.bahan_baku?.unit || ''}
            </div>
          </div>
        ),
      },
      {
        accessorKey: "jumlah_dibutuhkan",
        header: "Jumlah",
        cell: ({ row }) => (
          <div className="font-medium text-gray-900 dark:text-white">
            {row.getValue("jumlah_dibutuhkan")} {row.original.bahan_baku?.unit || ''}
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
          <CardHeader className="border-b border-gray-200 dark:border-gray-700">
            <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
              <div>
                <CardTitle className="text-xl font-semibold text-gray-800 dark:text-white flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-blue-500" />
                  Daftar Resep
                </CardTitle>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Kelola resep produksi parfum Anda
                </p>
              </div>
              <Button 
                onClick={handleAdd}
                className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
              >
                <Plus className="mr-2 h-4 w-4" />
                Tambah Resep
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <DataTable 
              columns={columns} 
              data={filteredData} 
              searchKey="produk_jadi"
              searchPlaceholder="Cari produk atau bahan baku..."
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}