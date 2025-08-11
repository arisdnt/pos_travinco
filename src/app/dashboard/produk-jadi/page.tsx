'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, Package, Package2, TrendingUp, DollarSign, AlertTriangle, Eye } from 'lucide-react';
import { DataTable, SortableHeader, ActionDropdown } from '@/components/ui/data-table';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { StatCard, StatCardVariants } from '@/components/ui/stat-card';
import { Navbar, createNavbarActions } from '@/components/layout/navbar';
import { formatCurrency, formatDate } from '@/lib/utils';
import { supabase, getProdukJadi, getCurrentUser } from '@/lib/supabase';
import { toast } from 'sonner';

interface ProdukJadi {
  id: string
  nama_produk_jadi: string
  harga_jual: number
  stok: number
  created_at: string
}

interface Stats {
  total: number
  lowStock: number
  outOfStock: number
  totalValue: number
}

export default function ProdukJadiPage() {
  const router = useRouter()
  const [data, setData] = useState<ProdukJadi[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [stats, setStats] = useState<Stats>({
    total: 0,
    lowStock: 0,
    outOfStock: 0,
    totalValue: 0
  })

  const fetchData = async () => {
    try {
      setLoading(true)
      const { data: produkJadi, error } = await supabase
        .from('produk_jadi')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error

      setData(produkJadi || [])
      
      // Calculate stats
      const total = produkJadi?.length || 0
      const lowStock = produkJadi?.filter(item => item.stok > 0 && item.stok <= 10).length || 0
      const outOfStock = produkJadi?.filter(item => item.stok === 0).length || 0
      const totalValue = produkJadi?.reduce((sum, item) => sum + (item.harga_jual * item.stok), 0) || 0
      
      setStats({ total, lowStock, outOfStock, totalValue })
    } catch (error) {
      console.error('Error fetching data:', error)
      toast.error('Gagal memuat data produk jadi')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleAdd = () => {
    router.push('/dashboard/produk-jadi/add')
  }

  const handleEdit = (id: string) => {
    router.push(`/dashboard/produk-jadi/edit/${id}`)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus produk ini?')) return

    try {
      const { error } = await supabase
        .from('produk_jadi')
        .delete()
        .eq('id', id)

      if (error) throw error

      toast.success('Produk berhasil dihapus')
      fetchData()
    } catch (error) {
      console.error('Error deleting product:', error)
      toast.error('Gagal menghapus produk')
    }
  }

  const filteredData = data.filter(item =>
    item.nama_produk_jadi.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const columns = useMemo<ColumnDef<ProdukJadi>[]>(
    () => [
      {
        accessorKey: "nama_produk_jadi",
        header: ({ column }) => (
          <SortableHeader column={column}>Produk</SortableHeader>
        ),
        cell: ({ row }) => (
          <div className="font-medium text-gray-900 dark:text-white">
            {row.getValue("nama_produk_jadi")}
          </div>
        ),
      },
      {
        accessorKey: "stok",
        header: ({ column }) => (
          <SortableHeader column={column}>Stok</SortableHeader>
        ),
        cell: ({ row }) => {
          const stok = row.getValue("stok") as number
          return (
            <Badge variant={stok === 0 ? 'destructive' : stok <= 10 ? 'secondary' : 'default'}>
              {stok} unit
            </Badge>
          )
        },
      },
      {
        accessorKey: "harga_jual",
        header: ({ column }) => (
          <SortableHeader column={column}>Harga Jual</SortableHeader>
        ),
        cell: ({ row }) => (
          <div className="font-medium text-gray-900 dark:text-white">
            {formatCurrency(row.getValue("harga_jual"))}
          </div>
        ),
      },
      {
        accessorKey: "created_at",
        header: ({ column }) => (
          <SortableHeader column={column}>Tanggal Dibuat</SortableHeader>
        ),
        cell: ({ row }) => (
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {formatDate(row.getValue("created_at"))}
          </div>
        ),
      },
      {
        id: "actions",
        header: "Aksi",
        cell: ({ row }) => (
          <ActionDropdown>
            <DropdownMenuItem 
              onClick={() => router.push(`/dashboard/produk-jadi/detail/${row.original.id}`)}
            >
              <Eye className="mr-2 h-4 w-4" />
              Detail
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => handleEdit(row.original.id)}
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
    [router, handleEdit, handleDelete]
  );

  const navbarActions = useMemo(() => [
    {
      label: "Tambah Produk Jadi",
      onClick: handleAdd,
      icon: Plus,
      variant: "default" as const
    },
    {
      label: "Export",
      onClick: () => {
        // TODO: Implement export functionality
        console.log("Export data");
      },
      variant: "outline" as const
    },
    {
      label: "Filter Lanjutan",
      onClick: () => {
        // TODO: Implement advanced filter
        console.log("Advanced filter");
      },
      variant: "outline" as const
    }
  ], []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <span>Memuat data produk jadi...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <Navbar 
        title="Produk Jadi" 
        actions={navbarActions}
      />
      <div className="flex-1 p-4 md:p-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Produk"
            value={stats.total.toString()}
            subtitle="jenis produk"
            icon={Package}
            {...StatCardVariants.primary}
          />
          <StatCard
            title="Nilai Stok"
            value={formatCurrency(stats.totalValue)}
            subtitle="total nilai"
            icon={DollarSign}
            {...StatCardVariants.success}
          />
          <StatCard
            title="Stok Rendah"
            value={stats.lowStock.toString()}
            subtitle="perlu restok"
            icon={AlertTriangle}
            {...StatCardVariants.warning}
          />
          <StatCard
            title="Habis Stok"
            value={stats.outOfStock.toString()}
            subtitle="stok kosong"
            icon={Package2}
            {...StatCardVariants.danger}
          />
        </div>

        {/* Alert Cards */}
        {stats.outOfStock > 0 && (
          <Card className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20">
            <CardContent className="flex items-center gap-3 p-4">
              <Package2 className="h-5 w-5 text-red-600" />
              <div>
                <p className="font-medium text-red-800 dark:text-red-200">
                  {stats.outOfStock} produk habis stok
                </p>
                <p className="text-sm text-red-600 dark:text-red-300">
                  Segera lakukan produksi ulang
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {stats.lowStock > 0 && (
          <Card className="border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-900/20">
            <CardContent className="flex items-center gap-3 p-4">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              <div>
                <p className="font-medium text-yellow-800 dark:text-yellow-200">
                  {stats.lowStock} produk stok rendah
                </p>
                <p className="text-sm text-yellow-600 dark:text-yellow-300">
                  Pertimbangkan untuk menambah produksi
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Content */}
        <Card className="shadow-lg border-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
          <CardHeader className="border-b border-gray-200 dark:border-gray-700">
            <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
              <div>
                <CardTitle className="text-xl font-semibold text-gray-800 dark:text-white flex items-center gap-2">
                  <Package className="w-5 h-5 text-blue-500" />
                  Daftar Produk Jadi
                </CardTitle>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Kelola inventaris produk jadi parfum Anda
                </p>
              </div>
              <Button 
                onClick={handleAdd}
                className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
              >
                <Plus className="mr-2 h-4 w-4" />
                Tambah Produk Jadi
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <DataTable 
              columns={columns} 
              data={filteredData} 
              searchKey="nama_produk_jadi"
              searchPlaceholder="Cari produk..."
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}