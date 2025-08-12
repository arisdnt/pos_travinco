'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { DataTable, SortableHeader, ActionDropdown } from '@/components/ui/data-table';
import {
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { Navbar } from '@/components/layout/navbar';
import { Badge } from '@/components/ui/badge';
import { StatCard, StatCardVariants } from '@/components/ui/stat-card';
import { Plus, Calendar, Package, AlertTriangle, Eye, Edit, Trash2, TrendingUp, Users, BarChart3 } from 'lucide-react';
import { toast } from 'sonner';
import { formatDate, formatCurrency } from '@/lib/utils';
import type { ReservasiStokSupplier } from '@/types/master-data';
import type { ColumnDef } from '@tanstack/react-table';

interface ReservasiStokStats {
  totalReservasi: number;
  totalSupplier: number;
  totalJumlahReservasi: number;
  uniqueBahanBaku: number;
}

export default function ReservasiStokPage() {
  const router = useRouter();
  const [reservasiStoks, setReservasiStoks] = useState<ReservasiStokSupplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [stats, setStats] = useState<ReservasiStokStats>({
    totalReservasi: 0,
    totalSupplier: 0,
    totalJumlahReservasi: 0,
    uniqueBahanBaku: 0
  });

  const fetchReservasiStoks = async () => {
    try {
      setLoading(true);
      const supabase = createClient();
      
      const { data, error } = await supabase
        .from('reservasi_stok_supplier')
        .select(`
          *,
          bahan_baku (
            id,
            nama_bahan_baku,
            unit_dasar (
              nama_unit
            ),
            kategori (
              nama_kategori
            )
          ),
          suppliers (
            id,
            nama_supplier,
            kontak
          ),
          kemasan (
            id,
            nama_kemasan,
            nilai_konversi
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching reservasi stok:', error);
        toast.error('Gagal memuat data reservasi stok');
        return;
      }

      setReservasiStoks(data || []);
      
      // Fetch statistics
      await fetchStats();
    } catch (error) {
      console.error('Error in fetchReservasiStoks:', error);
      toast.error('Terjadi kesalahan saat memuat data');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const supabase = createClient();
      
      // Get total reservasi
      const { count: totalReservasi } = await supabase
        .from('reservasi_stok_supplier')
        .select('*', { count: 'exact', head: true });
      
      // Get unique suppliers
      const { data: supplierData } = await supabase
        .from('reservasi_stok_supplier')
        .select('supplier_id')
        .not('supplier_id', 'is', null);
      
      const totalSupplier = new Set(supplierData?.map(item => item.supplier_id) || []).size;
      
      // Get total jumlah reservasi
      const { data: jumlahData } = await supabase
        .from('reservasi_stok_supplier')
        .select('jumlah_reservasi');
      
      const totalJumlahReservasi = jumlahData?.reduce((sum, item) => sum + (item.jumlah_reservasi || 0), 0) || 0;
      
      // Get unique bahan baku
      const { data: bahanBakuData } = await supabase
        .from('reservasi_stok_supplier')
        .select('bahan_baku_id')
        .not('bahan_baku_id', 'is', null);
      
      const uniqueBahanBaku = new Set(bahanBakuData?.map(item => item.bahan_baku_id) || []).size;
      
      setStats({
        totalReservasi: totalReservasi || 0,
        totalSupplier,
        totalJumlahReservasi: Math.round(totalJumlahReservasi),
        uniqueBahanBaku
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleAdd = () => {
    router.push('/dashboard/master-data/reservasi-stok/add');
  };

  const handleEdit = (id: string) => {
    router.push(`/dashboard/master-data/reservasi-stok/${id}/edit`);
  };

  const handleDelete = async (id: string, catatan: string) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus reservasi "${catatan || 'ini'}"?`)) {
      return;
    }

    try {
      setDeleting(id);
      const supabase = createClient();
      
      const { error } = await supabase
        .from('reservasi_stok_supplier')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting reservasi stok:', error);
        toast.error('Gagal menghapus reservasi stok');
        return;
      }

      toast.success('Reservasi stok berhasil dihapus');
      fetchReservasiStoks();
    } catch (error) {
      console.error('Error in handleDelete:', error);
      toast.error('Terjadi kesalahan saat menghapus data');
    } finally {
      setDeleting(null);
    }
  };



  const columns: ColumnDef<ReservasiStokSupplier>[] = useMemo(() => [
    {
      accessorKey: 'created_at',
      header: ({ column }) => (
        <SortableHeader column={column}>Tanggal Dibuat</SortableHeader>
      ),
      cell: ({ row }) => {
        const createdDate = row.getValue('created_at') as string;
        const updatedDate = row.original.updated_at as string;
        return (
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-gray-500" />
            <div>
              <div>{formatDate(createdDate)}</div>
              {updatedDate && (
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Diperbarui: {formatDate(updatedDate)}
                </div>
              )}
            </div>
          </div>
        );
      },
    },
    {
      id: 'bahan_baku',
      header: ({ column }) => (
        <SortableHeader column={column}>Bahan Baku</SortableHeader>
      ),
      cell: ({ row }) => {
        const bahanBaku = row.original.bahan_baku;
        return (
          <div>
            <div className="font-medium">{bahanBaku?.nama_bahan_baku || 'Bahan baku tidak ditemukan'}</div>
            <div className="text-sm text-gray-500">{bahanBaku?.kategori?.nama_kategori || 'Kategori tidak diketahui'}</div>
          </div>
        );
      },
    },
    {
      id: 'suppliers',
      header: ({ column }) => (
        <SortableHeader column={column}>Supplier</SortableHeader>
      ),
      cell: ({ row }) => {
        const supplier = row.original.suppliers;
        return (
          <div>
            <div className="font-medium">{supplier?.nama_supplier || 'Supplier tidak ditemukan'}</div>
            <div className="text-sm text-gray-500">{supplier?.kontak || 'Kontak tidak tersedia'}</div>
          </div>
        );
      },
    },
    {
      id: 'kemasan',
      header: ({ column }) => (
        <SortableHeader column={column}>Kemasan</SortableHeader>
      ),
      cell: ({ row }) => {
        const kemasan = row.original.kemasan;
        const bahanBaku = row.original.bahan_baku;
        
        if (kemasan) {
          return (
            <div>
              <div className="font-medium">{kemasan.nama_kemasan}</div>
              <div className="text-sm text-gray-500">
                1 {kemasan.nama_kemasan} = {kemasan.nilai_konversi} {bahanBaku?.unit_dasar?.nama_unit || 'unit'}
              </div>
            </div>
          );
        }
        
        return (
          <div className="text-sm text-gray-500 italic">
            Satuan dasar ({bahanBaku?.unit_dasar?.nama_unit || 'unit'})
          </div>
        );
      },
    },
    {
      accessorKey: 'jumlah_reservasi',
      header: ({ column }) => (
        <SortableHeader column={column}>Jumlah Reservasi</SortableHeader>
      ),
      cell: ({ row }) => {
        const jumlah = row.getValue('jumlah_reservasi') as number;
        const kemasan = row.original.kemasan;
        const bahanBaku = row.original.bahan_baku;
        
        if (kemasan) {
          const jumlahKemasan = jumlah / kemasan.nilai_konversi;
          return (
            <div>
              <div className="font-medium">{jumlahKemasan.toLocaleString('id-ID')} {kemasan.nama_kemasan}</div>
              <div className="text-sm text-gray-500">
                ({jumlah.toLocaleString('id-ID')} {bahanBaku?.unit_dasar?.nama_unit || 'unit'})
              </div>
            </div>
          );
        }
        
        return (
          <div className="font-medium">
            {jumlah.toLocaleString('id-ID')} {bahanBaku?.unit_dasar?.nama_unit || 'unit'}
          </div>
        );
      },
    },
    {
      accessorKey: 'catatan',
      header: 'Catatan',
      cell: ({ row }) => {
        const catatan = row.getValue('catatan') as string;
        return catatan ? (
          <span className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
            {catatan}
          </span>
        ) : '-';
      },
    },
    {
      id: 'actions',
      header: 'Aksi',
      cell: ({ row }) => {
        const reservasi = row.original;
        const isDeleting = deleting === reservasi.id;
        
        return (
          <ActionDropdown>
            <DropdownMenuItem onClick={() => router.push(`/dashboard/master-data/reservasi-stok/${reservasi.id}`)}>
              <Eye className="mr-2 h-4 w-4" />
              Detail
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleEdit(reservasi.id)}>
              <Edit className="mr-2 h-4 w-4" />
              Edit Reservasi
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => handleDelete(reservasi.id, reservasi.catatan || 'reservasi')}
              className="text-red-600 focus:text-red-600"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {isDeleting ? 'Menghapus...' : 'Hapus Reservasi'}
            </DropdownMenuItem>
          </ActionDropdown>
        );
      },
    },
  ], [deleting]);

  useEffect(() => {
    fetchReservasiStoks();
  }, []);

  return (
    <div className="flex h-full flex-col">
      <Navbar
        title="Reservasi Stok"
        actions={[
          {
            label: 'Tambah Reservasi',
            onClick: handleAdd,
            icon: Plus,
            variant: 'default'
          }
        ]}
      />
      
      <div className="flex-1 space-y-6 p-4 md:p-6">
        {/* Stats Cards */}
         <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
           <StatCard
             title="Total Reservasi"
             value={stats.totalReservasi.toString()}
             subtitle="reservasi aktif"
             icon={Package}
             {...StatCardVariants.primary}
           />
           <StatCard
             title="Total Supplier"
             value={stats.totalSupplier.toString()}
             subtitle="supplier terlibat"
             icon={Users}
             {...StatCardVariants.success}
           />
           <StatCard
             title="Total Unit Reservasi"
             value={stats.totalJumlahReservasi.toLocaleString()}
             subtitle="unit direservasi"
             icon={BarChart3}
             {...StatCardVariants.warning}
           />
           <StatCard
             title="Bahan Baku Unik"
             value={stats.uniqueBahanBaku.toString()}
             subtitle="jenis bahan baku"
             icon={TrendingUp}
             {...StatCardVariants.purple}
           />
         </div>

        <Card className="shadow-lg border-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
          <CardContent className="p-6">
            <DataTable
              columns={columns}
              data={reservasiStoks}
              searchKey="catatan"
              searchPlaceholder="Cari reservasi, bahan baku, atau supplier..."
              hideColumnToggle={true}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}