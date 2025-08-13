"use client"

import { useState, useMemo, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { ColumnDef } from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plus, Edit, Trash2, Search, Tag, Eye, Filter, Tags, Layers, BookOpen, Hash } from "lucide-react"

import { formatDateTime } from "@/lib/utils"
import { DataTable, SortableHeader, ActionDropdown } from "@/components/ui/data-table"
import {
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu"
import { Navbar } from "@/components/layout/navbar"
import { StatCard, StatCardVariants } from "@/components/ui/stat-card"
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog"
import { createClient } from '@/lib/supabase/client'
import { toast } from "sonner"
import type { Kategori } from '@/types/master-data'

export default function KategoriPage() {
  const router = useRouter();
  const [data, setData] = useState<Kategori[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    withDescription: 0,
    recentlyAdded: 0,
    mostUsed: 0
  });
  const [deleteDialog, setDeleteDialog] = useState({
    open: false,
    kategori: null as Kategori | null,
    loading: false
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const supabase = createClient();
      const { data: kategoris, error } = await supabase
        .from('kategori')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Sort by created_at descending (newest first)
      const sortedKategoris = kategoris?.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()) || [];
      setData(sortedKategoris);
      
      // Calculate stats
      const total = kategoris?.length || 0;
      const withDescription = kategoris?.filter(item => item.deskripsi && item.deskripsi.trim() !== '').length || 0;
      const recentlyAdded = kategoris?.filter(item => {
        const createdDate = new Date(item.created_at);
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return createdDate >= weekAgo;
      }).length || 0;
      const mostUsed = Math.floor(total * 0.3); // Placeholder calculation
      
      setStats({ total, withDescription, recentlyAdded, mostUsed });
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Gagal memuat data kategori');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    router.push('/dashboard/master-data/kategori/add');
  };

  const handleEdit = (item: Kategori) => {
    router.push(`/dashboard/master-data/kategori/${item.id}/edit`);
  };

  const handleDelete = useCallback((id: string) => {
    const item = data.find(d => d.id === id);
    if (!item) return;
    
    setDeleteDialog({
      open: true,
      kategori: item,
      loading: false
    });
  }, [data]);

  const handleConfirmDelete = async () => {
    if (!deleteDialog.kategori) return;

    setDeleteDialog(prev => ({ ...prev, loading: true }));

    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('kategori')
        .delete()
        .eq('id', deleteDialog.kategori.id);

      if (error) {
        if (error.code === '23503') {
          toast.error('Kategori tidak dapat dihapus karena masih digunakan oleh bahan baku');
        } else {
          throw error;
        }
        return;
      }

      toast.success('Kategori berhasil dihapus!');
      setDeleteDialog({ open: false, kategori: null, loading: false });
      fetchData(); // Refresh data
    } catch (error: any) {
      console.error('Error deleting kategori:', error);
      toast.error(error.message || 'Gagal menghapus kategori');
    } finally {
      setDeleteDialog(prev => ({ ...prev, loading: false }));
    }
  };

  const columns: ColumnDef<Kategori>[] = useMemo(
    () => [
      {
        accessorKey: "nama_kategori",
        header: ({ column }) => (
          <SortableHeader column={column}>Nama Kategori</SortableHeader>
        ),
        cell: ({ row }) => (
          <div>
            <div className="font-medium text-gray-900 dark:text-white">
              {row.getValue("nama_kategori")}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              <Tag className="w-3 h-3 inline mr-1" />
              Kategori
            </div>
          </div>
        ),
      },
      {
        accessorKey: "deskripsi",
        header: ({ column }) => (
          <SortableHeader column={column}>Deskripsi</SortableHeader>
        ),
        cell: ({ row }) => {
          const deskripsi = row.getValue("deskripsi") as string;
          return (
            <div className="max-w-xs">
              <div className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">
                {deskripsi || 'Tidak ada deskripsi'}
              </div>
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
                onSelect={() => router.push(`/dashboard/master-data/kategori/${item.id}`)}
              >
                <Eye className="mr-2 h-4 w-4" />
                Lihat Detail
              </DropdownMenuItem>
              <DropdownMenuItem 
                onSelect={() => router.push(`/dashboard/master-data/kategori/${item.id}/edit`)}
              >
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem 
                onSelect={() => handleDelete(item.id)}
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
    [router, handleDelete]
  )

  const navbarActions = [
    {
      label: "Tambah Kategori",
      onClick: () => router.push('/dashboard/master-data/kategori/add'),
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
    <>
    <div className="flex flex-col h-full">
      <Navbar 
        title="Kategori" 
        actions={navbarActions}
      />
      <div className="flex-1 p-4 md:p-6 space-y-6">

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Kategori"
            value={stats.total.toString()}
            subtitle="kategori terdaftar"
            icon={Tags}
            {...StatCardVariants.primary}
          />
          <StatCard
            title="Dengan Deskripsi"
            value={stats.withDescription.toString()}
            subtitle="memiliki deskripsi"
            icon={BookOpen}
            {...StatCardVariants.success}
          />
          <StatCard
            title="Baru Ditambah"
            value={stats.recentlyAdded.toString()}
            subtitle="7 hari terakhir"
            icon={Layers}
            {...StatCardVariants.warning}
          />
          <StatCard
            title="Sering Digunakan"
            value={stats.mostUsed.toString()}
            subtitle="kategori populer"
            icon={Hash}
            {...StatCardVariants.primary}
          />
        </div>

      {/* Main Content */}
      <Card className="shadow-lg border-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
        <CardContent className="p-6">
          <DataTable 
            columns={columns} 
            data={data} 
            searchKey="nama_kategori"
            searchPlaceholder="Cari kategori..."
            hideColumnToggle={true}
          />
        </CardContent>
      </Card>

      </div>
    </div>

    {/* Confirmation Dialog */}
    <ConfirmationDialog
      open={deleteDialog.open}
      onOpenChange={(open) => setDeleteDialog(prev => ({ ...prev, open }))}
      title="Hapus Kategori"
      description={`Apakah Anda yakin ingin menghapus kategori "${deleteDialog.kategori?.nama_kategori}"? Tindakan ini tidak dapat dibatalkan.`}
      confirmText="Hapus"
      cancelText="Batal"
      variant="destructive"
      onConfirm={handleConfirmDelete}
      loading={deleteDialog.loading}
    />
    </>
  )
}