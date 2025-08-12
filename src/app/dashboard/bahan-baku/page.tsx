"use client"

import { useState, useMemo, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ColumnDef } from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plus, Edit, Trash2, Search, Package, AlertTriangle, CheckCircle, Filter, MoreHorizontal, TrendingUp, DollarSign, Eye, Truck, XCircle, Package2 } from "lucide-react"
import { BahanBakuForm } from "@/components/forms/bahan-baku-form"
import { formatNumber, formatCurrency, formatDateTime } from "@/lib/utils"
import { DataTable, SortableHeader, ActionDropdown } from "@/components/ui/data-table"
import {
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu"
import { Navbar } from "@/components/layout/navbar"
import { StatCard, StatCardVariants } from "@/components/ui/stat-card"
import { supabase, getBahanBaku, getCurrentUser } from "@/lib/supabase"
import { toast } from "sonner"

// Data akan diambil dari Supabase sesuai skema database

const getStokStatus = (stok: number) => {
  if (stok > 50) return { color: 'text-green-600', label: 'Stok Aman', icon: <CheckCircle className="w-3 h-3" /> }
  if (stok > 10) return { color: 'text-yellow-600', label: 'Stok Sedang', icon: <Package className="w-3 h-3" /> }
  if (stok > 0) return { color: 'text-red-600', label: 'Stok Rendah', icon: <AlertTriangle className="w-3 h-3" /> }
  return { color: 'text-gray-600', label: 'Habis', icon: <Package className="w-3 h-3" /> }
}

type BahanBaku = {
  id: string
  nama_bahan_baku: string
  stok: number
  unit: string
  user_id: string
  created_at: string
}

// Helper functions removed as kategori field doesn't exist in database

export default function BahanBakuPage() {
  const router = useRouter();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false)
  const [editingItem, setEditingItem] = useState<BahanBaku | null>(null)
  const [stats, setStats] = useState({
    total: 0,
    lowStock: 0,
    outOfStock: 0,
    totalItems: 0
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const bahanBaku = await getBahanBaku();
      // Sort by created_at descending (newest first)
      const sortedBahanBaku = bahanBaku.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setData(sortedBahanBaku);
      
      // Calculate stats
      const total = bahanBaku.length;
      const lowStock = bahanBaku.filter(item => item.stok > 0 && item.stok <= 10).length;
      const outOfStock = bahanBaku.filter(item => item.stok === 0).length;
      const totalItems = bahanBaku.reduce((sum, item) => sum + item.stok, 0);
      
      setStats({ total, lowStock, outOfStock, totalItems });
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Gagal memuat data bahan baku');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    router.push('/dashboard/bahan-baku/add');
  }

  const handleEdit = (item: BahanBaku) => {
    router.push(`/dashboard/bahan-baku/edit/${item.id}`);
  }

  const handleDelete = async (id: string) => {
    const item = data.find(d => d.id === id);
    if (!item) return;
    
    const confirmed = window.confirm(
      `Apakah Anda yakin ingin menghapus bahan baku "${item.nama_bahan_baku}"?`
    );
    
    if (!confirmed) return;

    try {
      const user = await getCurrentUser();
      if (!user) {
        toast.error('Anda harus login terlebih dahulu');
        return;
      }

      const { error } = await supabase
        .from('bahan_baku')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      toast.success('Bahan baku berhasil dihapus!');
      fetchData(); // Refresh data
    } catch (error: any) {
      console.error('Error deleting bahan baku:', error);
      toast.error(error.message || 'Gagal menghapus bahan baku');
    }
  }

  const handleFormClose = () => {
    setShowForm(false)
    setEditingItem(null)
  }

  // Stats calculations moved to fetchData function

  const columns = useMemo<ColumnDef<BahanBaku>[]>(
    () => [
      {
        accessorKey: "nama_bahan_baku",
        header: ({ column }) => (
          <SortableHeader column={column}>Bahan Baku</SortableHeader>
        ),
        cell: ({ row }) => (
          <div>
            <div className="font-medium text-gray-900 dark:text-white">
              {row.getValue("nama_bahan_baku")}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {row.original.unit}
            </div>
          </div>
        ),
      },

      {
        accessorKey: "stok",
        header: ({ column }) => (
          <SortableHeader column={column}>Stok</SortableHeader>
        ),
        cell: ({ row }) => {
          const stok = row.getValue("stok") as number;
          const unit = row.original.unit;
          const status = getStokStatus(stok);
          return (
            <div className={`font-medium ${status.color}`}>
              {formatNumber(stok)} {unit}
            </div>
          );
        },
      },

      {
        accessorKey: "created_at",
        header: ({ column }) => (
          <SortableHeader column={column}>Ditambahkan</SortableHeader>
        ),
        cell: ({ row }) => (
          <div className="text-sm text-gray-600">
            {formatDateTime(row.getValue("created_at"))}
          </div>
        ),
      },
      {
        id: "actions",
        header: "Aksi",
        enableHiding: false,
        cell: ({ row }) => {
          const item = row.original
          return (
            <ActionDropdown>
              <DropdownMenuItem 
                onClick={() => router.push(`/dashboard/bahan-baku/detail/${item.id}`)}
              >
                <Eye className="mr-2 h-4 w-4" />
                Lihat Detail
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => router.push(`/dashboard/bahan-baku/edit/${item.id}`)}
              >
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => handleDelete(item.id)}
                className="text-red-600"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Hapus
              </DropdownMenuItem>
            </ActionDropdown>
          )
        },
      },
    ],
    [router]
  )

  const navbarActions = [
    {
      label: "Tambah Bahan Baku",
      onClick: () => setShowForm(true),
      icon: Plus,
      variant: "default" as const
    },
    {
      label: "Export",
      onClick: () => {
        // TODO: Implement export functionality
        console.log("Export data")
      },
      variant: "outline" as const
    },
    {
      label: "Filter Lanjutan",
      onClick: () => {
        // TODO: Implement advanced filter
        console.log("Advanced filter")
      },
      icon: Filter,
      variant: "outline" as const
    }
  ]

  return (
    <div className="flex flex-col h-full">
      <Navbar 
        title="Bahan Baku" 
        actions={navbarActions}
      />
      <div className="flex-1 p-4 md:p-6 space-y-6">

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Bahan Baku"
            value={stats.total.toString()}
            subtitle="jenis bahan"
            icon={Package}
            {...StatCardVariants.primary}
          />
          <StatCard
            title="Total Item Stok"
            value={stats.totalItems.toString()}
            subtitle="total unit"
            icon={Package2}
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
            title="Stok Habis"
            value={stats.outOfStock.toString()}
            subtitle="stok kosong"
            icon={XCircle}
            {...StatCardVariants.danger}
          />
        </div>

      {/* Main Content */}
      <Card className="shadow-lg border-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
        <CardContent className="p-6">
          <DataTable 
            columns={columns} 
            data={data} 
            searchKey="nama_bahan_baku"
            searchPlaceholder="Cari bahan baku..."
            hideColumnToggle={true}
          />
        </CardContent>
      </Card>

      {/* Form Modal */}
      {showForm && (
        <BahanBakuForm
          item={editingItem}
          onClose={handleFormClose}
          onSuccess={handleFormClose}
        />
      )}
      </div>
    </div>
  )
}