'use client';

import { useState, useEffect, useMemo } from 'react';
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

  useEffect(() => {
    fetchPenjualan();
  }, []);

  const fetchPenjualan = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
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
        `)
        .order('tanggal', { ascending: false });

      if (error) throw error;
      setPenjualanData((data as any) || []);
    } catch (error) {
      console.error('Error fetching penjualan:', error);
      toast.error('Gagal memuat data penjualan');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus transaksi penjualan ini?')) {
      return;
    }

    try {
      const user = await getCurrentUser();
      if (!user) {
        toast.error('Anda harus login terlebih dahulu');
        return;
      }

      const { error } = await supabase
        .from('penjualan')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Transaksi penjualan berhasil dihapus!');
      fetchPenjualan(); // Refresh data
    } catch (error: any) {
      console.error('Error deleting penjualan:', error);
      toast.error(error.message || 'Gagal menghapus transaksi penjualan');
    }
  };



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
              onClick={() => handleDelete(row.original.id)}
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

  const navbarActions = useMemo(() => [
    {
      label: "Tambah Penjualan",
      icon: Plus,
      onClick: () => router.push('/dashboard/penjualan/add'),
      variant: "default" as const
    },
    {
      label: "Filter",
      onClick: () => console.log('Filter'),
      variant: "outline" as const
    }
  ], [router]);

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

        <Card>
          <CardContent>
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
    </div>
  );
}