'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/ui/data-table';
import { ColumnDef } from '@tanstack/react-table';
import { FileText, AlertTriangle, CheckCircle, XCircle, Download, Filter, RefreshCw } from 'lucide-react';
import { Navbar } from '@/components/layout/navbar';
import { supabase, getCurrentUser } from '@/lib/supabase';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';

interface LaporanAkuntabilitas {
  bahan_baku_id: string;
  nama_bahan_baku: string;
  stok: number;
  supplier_eksklusif_id: string | null;
  supplier_eksklusif_nama: string | null;
  supplier_eksklusif_kontak: string | null;
  supplier_eksklusif_alamat: string | null;
  total_pembelian_eksklusif: number;
  total_jumlah_eksklusif: number;
  rata_rata_harga_eksklusif: number;
  total_pembelian_supplier_lain: number;
  total_jumlah_supplier_lain: number;
  status_akuntabilitas: 'TIDAK_ADA_SUPPLIER_EKSKLUSIF' | 'AKUNTABEL' | 'PELANGGARAN_TERDETEKSI';
  created_at: string;
}

interface PelanggaranDetail {
  bahan_baku_id: string;
  nama_bahan_baku: string;
  supplier_eksklusif_nama: string;
  pembelian_id: string;
  supplier_pelanggar_nama: string;
  jumlah: number;
  harga_beli: number;
  tanggal_pembelian: string;
  catatan: string;
}

export default function LaporanAkuntabilitasSupplierPage() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<LaporanAkuntabilitas[]>([]);
  const [pelanggaranData, setPelanggaranData] = useState<PelanggaranDetail[]>([]);
  const [showPelanggaran, setShowPelanggaran] = useState(false);
  const [filters, setFilters] = useState({
    status: '',
    bahan_baku: '',
    start_date: '',
    end_date: ''
  });

  useEffect(() => {
    fetchLaporanAkuntabilitas();
  }, []);

  const fetchLaporanAkuntabilitas = async () => {
    setLoading(true);
    try {
      const user = await getCurrentUser();
      if (!user) {
        toast.error('Anda harus login terlebih dahulu');
        return;
      }

      const { data: laporanData, error } = await supabase
        .from('laporan_akuntabilitas_supplier_eksklusif')
        .select('*')
        .eq('user_id', user.id)
        .order('nama_bahan_baku');

      if (error) throw error;
      setData(laporanData || []);
    } catch (error: any) {
      console.error('Error fetching laporan akuntabilitas:', error);
      toast.error('Gagal memuat laporan akuntabilitas');
    } finally {
      setLoading(false);
    }
  };

  const fetchPelanggaranDetail = async () => {
    setLoading(true);
    try {
      const user = await getCurrentUser();
      if (!user) {
        toast.error('Anda harus login terlebih dahulu');
        return;
      }

      const { data: pelanggaranData, error } = await supabase
        .rpc('get_pelanggaran_supplier_eksklusif', {
          p_user_id: user.id,
          p_bahan_baku_id: filters.bahan_baku || null,
          p_start_date: filters.start_date || null,
          p_end_date: filters.end_date || null
        });

      if (error) throw error;
      setPelanggaranData(pelanggaranData || []);
      setShowPelanggaran(true);
    } catch (error: any) {
      console.error('Error fetching pelanggaran detail:', error);
      toast.error('Gagal memuat detail pelanggaran');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'AKUNTABEL':
        return (
          <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
            <CheckCircle className="w-3 h-3 mr-1" />
            Akuntabel
          </Badge>
        );
      case 'PELANGGARAN_TERDETEKSI':
        return (
          <Badge variant="destructive">
            <AlertTriangle className="w-3 h-3 mr-1" />
            Pelanggaran
          </Badge>
        );
      case 'TIDAK_ADA_SUPPLIER_EKSKLUSIF':
        return (
          <Badge variant="secondary">
            <XCircle className="w-3 h-3 mr-1" />
            Tidak Ada Supplier Eksklusif
          </Badge>
        );
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const laporanColumns: ColumnDef<LaporanAkuntabilitas>[] = [
    {
      accessorKey: 'nama_bahan_baku',
      header: 'Bahan Baku',
      cell: ({ row }) => (
        <div className="font-medium">{row.getValue('nama_bahan_baku')}</div>
      ),
    },
    {
      accessorKey: 'supplier_eksklusif_nama',
      header: 'Supplier Eksklusif',
      cell: ({ row }) => {
        const nama = row.getValue('supplier_eksklusif_nama') as string;
        return nama ? (
          <div className="text-sm">
            <div className="font-medium">{nama}</div>
            <div className="text-gray-500 dark:text-gray-400">
              {row.original.supplier_eksklusif_kontak}
            </div>
          </div>
        ) : (
          <span className="text-gray-400 italic">Tidak ada</span>
        );
      },
    },
    {
      accessorKey: 'total_pembelian_eksklusif',
      header: 'Pembelian Eksklusif',
      cell: ({ row }) => (
        <div className="text-sm">
          <div>{row.getValue('total_pembelian_eksklusif')} transaksi</div>
          <div className="text-gray-500 dark:text-gray-400">
            {row.original.total_jumlah_eksklusif.toLocaleString()} unit
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'total_pembelian_supplier_lain',
      header: 'Pembelian Lain',
      cell: ({ row }) => {
        const total = row.getValue('total_pembelian_supplier_lain') as number;
        return (
          <div className="text-sm">
            <div className={total > 0 ? 'text-red-600 font-medium' : ''}>
              {total} transaksi
            </div>
            <div className={`text-gray-500 dark:text-gray-400 ${total > 0 ? 'text-red-500' : ''}`}>
              {row.original.total_jumlah_supplier_lain.toLocaleString()} unit
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'rata_rata_harga_eksklusif',
      header: 'Rata-rata Harga',
      cell: ({ row }) => {
        const harga = row.getValue('rata_rata_harga_eksklusif') as number;
        return harga > 0 ? (
          <div className="text-sm font-medium">
            Rp {harga.toLocaleString('id-ID')}
          </div>
        ) : (
          <span className="text-gray-400 italic">-</span>
        );
      },
    },
    {
      accessorKey: 'status_akuntabilitas',
      header: 'Status',
      cell: ({ row }) => getStatusBadge(row.getValue('status_akuntabilitas')),
    },
  ];

  const pelanggaranColumns: ColumnDef<PelanggaranDetail>[] = [
    {
      accessorKey: 'nama_bahan_baku',
      header: 'Bahan Baku',
      cell: ({ row }) => (
        <div className="font-medium">{row.getValue('nama_bahan_baku')}</div>
      ),
    },
    {
      accessorKey: 'supplier_eksklusif_nama',
      header: 'Supplier Eksklusif',
      cell: ({ row }) => (
        <div className="text-sm font-medium text-green-600 dark:text-green-400">
          {row.getValue('supplier_eksklusif_nama')}
        </div>
      ),
    },
    {
      accessorKey: 'supplier_pelanggar_nama',
      header: 'Supplier Pelanggar',
      cell: ({ row }) => (
        <div className="text-sm font-medium text-red-600 dark:text-red-400">
          {row.getValue('supplier_pelanggar_nama')}
        </div>
      ),
    },
    {
      accessorKey: 'jumlah',
      header: 'Jumlah',
      cell: ({ row }) => (
        <div className="text-sm font-medium">
          {(row.getValue('jumlah') as number).toLocaleString()}
        </div>
      ),
    },
    {
      accessorKey: 'harga_beli',
      header: 'Harga Beli',
      cell: ({ row }) => (
        <div className="text-sm font-medium">
          Rp {(row.getValue('harga_beli') as number).toLocaleString('id-ID')}
        </div>
      ),
    },
    {
      accessorKey: 'tanggal_pembelian',
      header: 'Tanggal',
      cell: ({ row }) => (
        <div className="text-sm">
          {format(new Date(row.getValue('tanggal_pembelian')), 'dd MMM yyyy', { locale: localeId })}
        </div>
      ),
    },
  ];

  const filteredData = data.filter(item => {
    if (filters.status && item.status_akuntabilitas !== filters.status) return false;
    if (filters.bahan_baku && !item.nama_bahan_baku.toLowerCase().includes(filters.bahan_baku.toLowerCase())) return false;
    return true;
  });

  const stats = {
    total: data.length,
    akuntabel: data.filter(d => d.status_akuntabilitas === 'AKUNTABEL').length,
    pelanggaran: data.filter(d => d.status_akuntabilitas === 'PELANGGARAN_TERDETEKSI').length,
    tanpa_supplier: data.filter(d => d.status_akuntabilitas === 'TIDAK_ADA_SUPPLIER_EKSKLUSIF').length
  };

  const navbarActions = [
    {
      label: "Refresh",
      onClick: fetchLaporanAkuntabilitas,
      icon: RefreshCw,
      variant: "outline" as const
    },
    {
      label: "Detail Pelanggaran",
      onClick: fetchPelanggaranDetail,
      icon: AlertTriangle,
      variant: "destructive" as const
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar 
        title="Laporan Akuntabilitas Supplier Eksklusif" 
        actions={navbarActions}
      />
      
      <div className="p-4 mx-auto max-w-7xl md:p-6 space-y-6">
        {/* Statistics Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Bahan Baku</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
                </div>
                <FileText className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Akuntabel</p>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.akuntabel}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Pelanggaran</p>
                  <p className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.pelanggaran}</p>
                </div>
                <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Tanpa Supplier Eksklusif</p>
                  <p className="text-2xl font-bold text-gray-600 dark:text-gray-400">{stats.tanpa_supplier}</p>
                </div>
                <XCircle className="w-8 h-8 text-gray-600 dark:text-gray-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Filter Laporan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={filters.status}
                  onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Semua status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Semua status</SelectItem>
                    <SelectItem value="AKUNTABEL">Akuntabel</SelectItem>
                    <SelectItem value="PELANGGARAN_TERDETEKSI">Pelanggaran</SelectItem>
                    <SelectItem value="TIDAK_ADA_SUPPLIER_EKSKLUSIF">Tanpa Supplier Eksklusif</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bahan_baku">Bahan Baku</Label>
                <Input
                  id="bahan_baku"
                  placeholder="Cari bahan baku..."
                  value={filters.bahan_baku}
                  onChange={(e) => setFilters(prev => ({ ...prev, bahan_baku: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="start_date">Tanggal Mulai</Label>
                <Input
                  id="start_date"
                  type="date"
                  value={filters.start_date}
                  onChange={(e) => setFilters(prev => ({ ...prev, start_date: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="end_date">Tanggal Akhir</Label>
                <Input
                  id="end_date"
                  type="date"
                  value={filters.end_date}
                  onChange={(e) => setFilters(prev => ({ ...prev, end_date: e.target.value }))}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Report Table */}
        {!showPelanggaran ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Laporan Akuntabilitas Supplier Eksklusif
              </CardTitle>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={laporanColumns}
                data={filteredData}
                searchKey="nama_bahan_baku"
                searchPlaceholder="Cari bahan baku..."
              />
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                  Detail Pelanggaran Supplier Eksklusif
                </CardTitle>
                <Button
                  variant="outline"
                  onClick={() => setShowPelanggaran(false)}
                >
                  Kembali ke Laporan Utama
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={pelanggaranColumns}
                data={pelanggaranData}
                searchKey="nama_bahan_baku"
                searchPlaceholder="Cari bahan baku..."
              />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}