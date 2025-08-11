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
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';





export default function PembelianPage() {
  const router = useRouter();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchPembelianData();
  }, []);

  const fetchPembelianData = async () => {
    try {
      const { data: pembelianData, error } = await supabase
        .from('pembelian')
        .select(`
          *,
          bahan_baku:bahan_baku_id(nama_bahan_baku, unit)
        `);

      if (error) throw error;
      setData(pembelianData || []);
    } catch (error) {
      console.error('Error fetching pembelian data:', error);
    } finally {
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
      const { error } = await supabase
        .from('pembelian')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Data pembelian berhasil dihapus');
      fetchPembelianData();
    } catch (error) {
      console.error('Error deleting pembelian:', error);
      toast.error('Gagal menghapus data pembelian');
    }
  };

  const filteredData = data.filter(item => {
    const matchesSearch = searchTerm === '' ||
      item.bahan_baku?.nama_bahan_baku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.catatan?.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesSearch
  })

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
          <SortableHeader column={column}>Bahan</SortableHeader>
        ),
        cell: ({ row }) => (
          <div>
            <div className="font-medium text-gray-900 dark:text-white">
              {row.original.bahan_baku?.nama_bahan_baku || 'N/A'}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {row.original.catatan || ''}
            </div>
          </div>
        ),
      },
      {
        accessorKey: "jumlah",
        header: "Jumlah",
        cell: ({ row }) => (
          <div className="font-medium text-gray-900 dark:text-white">
            {row.getValue("jumlah")} {row.original.bahan_baku?.unit || ''}
          </div>
        ),
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
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Daftar Pembelian
            </CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable
              columns={columns}
              data={filteredData}
              searchKey="bahan_baku"
              searchPlaceholder="Cari bahan baku..."
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}