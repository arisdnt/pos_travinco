"use client"

import { useState, useMemo, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ColumnDef } from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plus, Edit, Trash2, Search, Users, Phone, MapPin, Eye, Filter, Building2, UserCheck } from "lucide-react"

import { formatDateTime } from "@/lib/utils"
import { DataTable, SortableHeader, ActionDropdown } from "@/components/ui/data-table"
import {
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu"
import { Navbar } from "@/components/layout/navbar"
import { StatCard, StatCardVariants } from "@/components/ui/stat-card"
import { createClient } from '@/lib/supabase/client'
import { toast } from "sonner"
import type { Supplier } from '@/types/master-data'

export default function SupplierPage() {
  const router = useRouter();
  const [data, setData] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    withContact: 0,
    withAddress: 0,
    recentlyAdded: 0
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const supabase = createClient();
      const { data: suppliers, error } = await supabase
        .from('suppliers')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Sort by created_at descending (newest first)
      const sortedSuppliers = suppliers?.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()) || [];
      setData(sortedSuppliers);
      
      // Calculate stats
      const total = suppliers?.length || 0;
      const withContact = suppliers?.filter(item => item.kontak && item.kontak.trim() !== '').length || 0;
      const withAddress = suppliers?.filter(item => item.alamat && item.alamat.trim() !== '').length || 0;
      const recentlyAdded = suppliers?.filter(item => {
        const createdDate = new Date(item.created_at);
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return createdDate >= weekAgo;
      }).length || 0;
      
      setStats({ total, withContact, withAddress, recentlyAdded });
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Gagal memuat data supplier');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    router.push('/dashboard/master-data/supplier/add');
  }

  const handleEdit = (item: Supplier) => {
    router.push(`/dashboard/master-data/supplier/${item.id}/edit`);
  }

  const handleDelete = async (id: string) => {
    const item = data.find(d => d.id === id);
    if (!item) return;
    
    const confirmed = window.confirm(
      `Apakah Anda yakin ingin menghapus supplier "${item.nama_supplier}"?`
    );
    
    if (!confirmed) return;

    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('suppliers')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Supplier berhasil dihapus!');
      fetchData(); // Refresh data
    } catch (error: any) {
      console.error('Error deleting supplier:', error);
      toast.error(error.message || 'Gagal menghapus supplier');
    }
  }

  // Stats calculations moved to fetchData function

  const columns = useMemo<ColumnDef<Supplier>[]>(
    () => [
      {
        accessorKey: "nama_supplier",
        header: ({ column }) => (
          <SortableHeader column={column}>Nama Supplier</SortableHeader>
        ),
        cell: ({ row }) => (
          <div>
            <div className="font-medium text-gray-900 dark:text-white">
              {row.getValue("nama_supplier")}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {row.original.kontak || 'Tidak ada kontak'}
            </div>
          </div>
        ),
      },
      {
        accessorKey: "alamat",
        header: ({ column }) => (
          <SortableHeader column={column}>Alamat</SortableHeader>
        ),
        cell: ({ row }) => {
          const alamat = row.getValue("alamat") as string;
          return (
            <div className="max-w-xs">
              <div className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">
                {alamat || 'Alamat tidak tersedia'}
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
                onClick={() => router.push(`/dashboard/master-data/supplier/${item.id}`)}
              >
                <Eye className="mr-2 h-4 w-4" />
                Lihat Detail
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => router.push(`/dashboard/master-data/supplier/${item.id}/edit`)}
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
      label: "Tambah Supplier",
      onClick: () => router.push('/dashboard/master-data/supplier/add'),
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
        title="Supplier" 
        actions={navbarActions}
      />
      <div className="flex-1 p-4 md:p-6 space-y-6">

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Supplier"
            value={stats.total.toString()}
            subtitle="supplier terdaftar"
            icon={Building2}
            {...StatCardVariants.primary}
          />
          <StatCard
            title="Dengan Kontak"
            value={stats.withContact.toString()}
            subtitle="memiliki kontak"
            icon={Phone}
            {...StatCardVariants.success}
          />
          <StatCard
            title="Dengan Alamat"
            value={stats.withAddress.toString()}
            subtitle="memiliki alamat"
            icon={MapPin}
            {...StatCardVariants.indigo}
          />
          <StatCard
            title="Baru Ditambah"
            value={stats.recentlyAdded.toString()}
            subtitle="7 hari terakhir"
            icon={UserCheck}
            {...StatCardVariants.warning}
          />
        </div>

      {/* Main Content */}
      <Card className="shadow-lg border-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
        <CardContent className="p-6">
          <DataTable 
            columns={columns} 
            data={data} 
            searchKey="nama_supplier"
            searchPlaceholder="Cari supplier..."
            hideColumnToggle={true}
          />
        </CardContent>
      </Card>


      </div>
    </div>
  )
}