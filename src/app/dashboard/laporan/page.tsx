'use client';

import { useState, useMemo, useEffect } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { Navbar } from '@/components/layout/navbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Download, FileText, BarChart3, TrendingUp, Package, Search, Calendar, Filter, PieChart, Activity, AlertTriangle } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { StatCard, StatCardVariants } from '@/components/ui/stat-card';
import { DataTable, SortableHeader } from '@/components/ui/data-table';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/auth/auth-provider';

// Interfaces untuk data dari database
interface LaporanPenjualan {
  nama_produk_jadi: string;
  sku: string;
  total_terjual: number;
  total_pendapatan: number;
  periode: string;
  user_id: string;
}

interface LaporanPemakaianBahan {
  nama_bahan_baku: string;
  unit: string;
  total_terpakai: number;
  periode: string;
  user_id: string;
}

interface ProdukJadi {
  id: string;
  nama_produk_jadi: string;
  sku: string;
  harga_jual: number;
  user_id: string;
}

interface StokTersedia {
  nama_produk_jadi: string;
  sku: string;
  stok_tersedia: number;
  status: string;
  min_stok: number;
  harga_jual: number;
  kategori: string;
}

interface PemakaianBahanWithCost {
  nama_bahan_baku: string;
  unit: string;
  total_terpakai: number;
  periode: string;
  harga_per_unit: number;
  total_biaya: number;
  kategori: string;
  supplier: string;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'Aman':
      return 'bg-green-100 text-green-800 border-green-200'
    case 'Rendah':
      return 'bg-red-100 text-red-800 border-red-200'
    case 'Sedang':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200'
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200'
  }
}

const getCategoryColor = (kategori: string) => {
  switch (kategori) {
    case 'Parfum':
      return 'bg-purple-100 text-purple-800 border-purple-200'
    case 'Body Mist':
      return 'bg-blue-100 text-blue-800 border-blue-200'
    case 'Base':
      return 'bg-gray-100 text-gray-800 border-gray-200'
    case 'Fragrance':
      return 'bg-pink-100 text-pink-800 border-pink-200'
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200'
  }
}

export default function LaporanPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('penjualan');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPeriode, setFilterPeriode] = useState('2024-01');
  const [filterKategori, setFilterKategori] = useState('all');
  const [loading, setLoading] = useState(true);
  
  // State untuk data dari database
  const [laporanPenjualan, setLaporanPenjualan] = useState<LaporanPenjualan[]>([]);
  const [laporanPemakaianBahan, setLaporanPemakaianBahan] = useState<PemakaianBahanWithCost[]>([]);
  const [stokTersedia, setStokTersedia] = useState<StokTersedia[]>([]);

  // Fetch data dari database
  useEffect(() => {
    if (user) {
      fetchAllData();
    }
  }, [user, filterPeriode]);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchLaporanPenjualan(),
        fetchLaporanPemakaianBahan(),
        fetchStokTersedia()
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLaporanPenjualan = async () => {
    try {
      const { data, error } = await supabase
        .from('laporan_penjualan')
        .select('*')
        .eq('user_id', user?.id)
        .order('periode', { ascending: false })
        .order('total_pendapatan', { ascending: false });

      if (error) throw error;
      setLaporanPenjualan(data || []);
    } catch (error) {
      console.error('Error fetching laporan penjualan:', error);
      setLaporanPenjualan([]);
    }
  };

  const fetchLaporanPemakaianBahan = async () => {
    try {
      // Fetch pemakaian bahan baku dari view
      const { data: pemakaianData, error: pemakaianError } = await supabase
        .from('laporan_pemakaian_bahan_baku')
        .select('*')
        .eq('user_id', user?.id)
        .order('periode', { ascending: false })
        .order('total_terpakai', { ascending: false });

      if (pemakaianError) throw pemakaianError;

      // Fetch data pembelian untuk mendapatkan harga beli
      const { data: pembelianData, error: pembelianError } = await supabase
        .from('pembelian')
        .select(`
          bahan_baku_id,
          harga_beli,
          bahan_baku:bahan_baku_id (
            nama_bahan_baku
          )
        `)
        .eq('user_id', user?.id);

      if (pembelianError) throw pembelianError;

      // Gabungkan data pemakaian dengan harga beli
      const enrichedData: PemakaianBahanWithCost[] = (pemakaianData || []).map((item: any) => {
        const pembelian = pembelianData?.find((p: any) => 
          p.bahan_baku?.nama_bahan_baku === item.nama_bahan_baku
        );
        const hargaPerUnit = pembelian?.harga_beli || 0;
        
        return {
          ...item,
          harga_per_unit: hargaPerUnit,
          total_biaya: item.total_terpakai * hargaPerUnit,
          kategori: 'Bahan Baku', // Default kategori
          supplier: 'N/A' // Default supplier
        };
      });

      setLaporanPemakaianBahan(enrichedData);
    } catch (error) {
      console.error('Error fetching laporan pemakaian bahan:', error);
      setLaporanPemakaianBahan([]);
    }
  };

  const fetchStokTersedia = async () => {
    try {
      // Fetch produk jadi
      const { data: produkData, error: produkError } = await supabase
        .from('produk_jadi')
        .select('*')
        .eq('user_id', user?.id);

      if (produkError) throw produkError;

      // Hitung stok tersedia untuk setiap produk menggunakan fungsi database
      const stokPromises = (produkData || []).map(async (produk) => {
        const { data: stokData, error: stokError } = await supabase
          .rpc('hitung_max_produksi', { produk_id: produk.id });

        if (stokError) {
          console.error('Error calculating stock for', produk.nama_produk_jadi, stokError);
          return null;
        }

        const stokTersedia = stokData || 0;
        const minStok = 5; // Default minimum stock
        let status = 'Aman';
        
        if (stokTersedia <= 0) {
          status = 'Habis';
        } else if (stokTersedia <= minStok) {
          status = 'Rendah';
        } else if (stokTersedia <= minStok * 2) {
          status = 'Sedang';
        }

        return {
          nama_produk_jadi: produk.nama_produk_jadi,
          sku: produk.sku,
          stok_tersedia: stokTersedia,
          status,
          min_stok: minStok,
          harga_jual: produk.harga_jual,
          kategori: 'Produk Jadi' // Default kategori
        };
      });

      const stokResults = await Promise.all(stokPromises);
      const validStokData = stokResults.filter(item => item !== null) as StokTersedia[];
      
      setStokTersedia(validStokData);
    } catch (error) {
      console.error('Error fetching stok tersedia:', error);
      setStokTersedia([]);
    }
  };

  const handleExportPDF = (reportType: string) => {
    // TODO: Implement PDF export functionality
    console.log('Export PDF:', reportType);
  };

  const handleExportExcel = (reportType: string) => {
    // TODO: Implement Excel export functionality
    console.log('Export Excel:', reportType);
  };

  const navbarActions = [
    {
      label: 'Export PDF',
      icon: FileText,
      onClick: () => handleExportPDF(activeTab),
      variant: 'outline' as const
    },
    {
      label: 'Export Excel',
      icon: Download,
      onClick: () => handleExportExcel(activeTab),
      variant: 'outline' as const
    },
    {
      label: 'Analisis',
      icon: BarChart3,
      onClick: () => console.log('Open analytics'),
      variant: 'default' as const
    }
  ];

  // Perhitungan statistik dari data nyata
  const totalPendapatan = laporanPenjualan.reduce((sum, item) => sum + (item.total_pendapatan || 0), 0);
  const totalUnitTerjual = laporanPenjualan.reduce((sum, item) => sum + (item.total_terjual || 0), 0);
  const totalBiayaBahan = laporanPemakaianBahan.reduce((sum, item) => sum + (item.total_biaya || 0), 0);
  const stokRendah = stokTersedia.filter(item => item.status === 'Rendah' || item.status === 'Habis').length;
  const totalNilaiStok = stokTersedia.reduce((sum, item) => sum + (item.stok_tersedia * item.harga_jual), 0);
  
  // Hitung margin rata-rata (estimasi sederhana)
  const avgMargin = totalPendapatan > 0 && totalBiayaBahan > 0 
    ? ((totalPendapatan - totalBiayaBahan) / totalPendapatan) * 100 
    : 0;

  const salesColumns = useMemo<ColumnDef<LaporanPenjualan>[]>(
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
        accessorKey: "sku",
        header: "SKU",
        cell: ({ row }) => (
          <Badge variant="outline" className="font-mono text-xs">
            {row.getValue("sku")}
          </Badge>
        ),
      },
      {
        accessorKey: "total_terjual",
        header: ({ column }) => (
          <SortableHeader column={column}>Unit Terjual</SortableHeader>
        ),
        cell: ({ row }) => (
          <div className="font-medium">
            {row.getValue("total_terjual") || 0}
          </div>
        ),
      },
      {
        accessorKey: "total_pendapatan",
        header: ({ column }) => (
          <SortableHeader column={column}>Total Pendapatan</SortableHeader>
        ),
        cell: ({ row }) => (
          <div className="font-semibold text-green-600 dark:text-green-400">
            {formatCurrency(row.getValue("total_pendapatan") || 0)}
          </div>
        ),
      },
      {
        accessorKey: "periode",
        header: "Periode",
        cell: ({ row }) => {
          const periode = row.getValue("periode") as string;
          return (
            <div className="text-gray-600 dark:text-gray-300">
              {periode ? formatDate(periode) : 'N/A'}
            </div>
          );
        },
      },
    ],
    []
  )

  const materialColumns = useMemo<ColumnDef<PemakaianBahanWithCost>[]>(
    () => [
      {
        accessorKey: "nama_bahan_baku",
        header: ({ column }) => (
          <SortableHeader column={column}>Bahan Baku</SortableHeader>
        ),
        cell: ({ row }) => (
          <div className="font-medium text-gray-900 dark:text-white">
            {row.getValue("nama_bahan_baku")}
          </div>
        ),
      },
      {
        accessorKey: "kategori",
        header: "Kategori",
        cell: ({ row }) => (
          <Badge className={getCategoryColor(row.getValue("kategori"))}>
            {row.getValue("kategori")}
          </Badge>
        ),
      },
      {
        accessorKey: "supplier",
        header: "Supplier",
        cell: ({ row }) => (
          <div className="text-gray-600 dark:text-gray-300">
            {row.getValue("supplier")}
          </div>
        ),
      },
      {
        accessorKey: "total_terpakai",
        header: ({ column }) => (
          <SortableHeader column={column}>Total Terpakai</SortableHeader>
        ),
        cell: ({ row }) => (
          <div className="font-medium">
            <div className="flex items-center gap-1">
              <span>{row.getValue("total_terpakai") || 0}</span>
              <span className="text-xs text-gray-500">{row.original.unit}</span>
            </div>
          </div>
        ),
      },
      {
        accessorKey: "harga_per_unit",
        header: ({ column }) => (
          <SortableHeader column={column}>Harga per Unit</SortableHeader>
        ),
        cell: ({ row }) => (
          <div className="text-gray-600 dark:text-gray-300">
            {formatCurrency(row.getValue("harga_per_unit") || 0)}
          </div>
        ),
      },
      {
        accessorKey: "total_biaya",
        header: ({ column }) => (
          <SortableHeader column={column}>Total Biaya</SortableHeader>
        ),
        cell: ({ row }) => (
          <div className="font-semibold text-red-600 dark:text-red-400">
            {formatCurrency(row.getValue("total_biaya") || 0)}
          </div>
        ),
      },
    ],
    []
  )

  const stockColumns = useMemo<ColumnDef<StokTersedia>[]>(
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
        accessorKey: "sku",
        header: "SKU",
        cell: ({ row }) => (
          <Badge variant="outline" className="font-mono text-xs">
            {row.getValue("sku")}
          </Badge>
        ),
      },
      {
        accessorKey: "kategori",
        header: "Kategori",
        cell: ({ row }) => (
          <Badge className={getCategoryColor(row.getValue("kategori"))}>
            {row.getValue("kategori")}
          </Badge>
        ),
      },
      {
        accessorKey: "stok_tersedia",
        header: ({ column }) => (
          <SortableHeader column={column}>Stok Tersedia</SortableHeader>
        ),
        cell: ({ row }) => (
          <div className="font-medium">
            <div className="flex items-center gap-2">
              <span>{row.getValue("stok_tersedia") || 0}</span>
              <span className="text-xs text-gray-500">unit</span>
              {(row.getValue("stok_tersedia") as number) <= row.original.min_stok && (
                <AlertTriangle className="w-4 h-4 text-orange-500" />
              )}
            </div>
          </div>
        ),
      },
      {
        accessorKey: "min_stok",
        header: "Min. Stok",
        cell: ({ row }) => (
          <div className="text-gray-600 dark:text-gray-300">
            {row.getValue("min_stok")} unit
          </div>
        ),
      },
      {
        accessorKey: "harga_jual",
        header: ({ column }) => (
          <SortableHeader column={column}>Harga Jual</SortableHeader>
        ),
        cell: ({ row }) => (
          <div className="font-medium text-blue-600 dark:text-blue-400">
            {formatCurrency(row.getValue("harga_jual") || 0)}
          </div>
        ),
      },
      {
        id: "status",
        header: "Status",
        cell: ({ row }) => (
          <Badge className={getStatusColor(row.original.status)}>
            {row.original.status}
          </Badge>
        ),
      },
    ],
    []
  )

  const filteredPenjualan = laporanPenjualan.filter(item => {
    const matchesSearch = item.nama_produk_jadi.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.sku.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesSearch
  })

  const filteredPemakaian = laporanPemakaianBahan.filter(item => {
    const matchesSearch = item.nama_bahan_baku.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.supplier.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesSearch
  })

  const filteredStok = stokTersedia.filter(item => {
    const matchesSearch = item.nama_produk_jadi.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.sku.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesSearch
  })

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-blue-900 dark:to-indigo-900">
        <Navbar title="Laporan" actions={navbarActions} />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Memuat data laporan...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-blue-900 dark:to-indigo-900">
      <Navbar title="Laporan" actions={navbarActions} />
      
      <div className="flex-1 p-6 space-y-6">
        {/* Header Actions */}
        <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Dashboard Laporan</h2>
            <p className="text-gray-600 dark:text-gray-400">Analisis komprehensif bisnis Anda</p>
          </div>
          <div className="flex space-x-2">
            <Button 
              variant="outline" 
              onClick={() => handleExportPDF(activeTab)}
              className="bg-white/50 dark:bg-gray-800/50 hover:bg-red-50 hover:border-red-300 hover:text-red-700 transition-colors"
            >
              <FileText className="mr-2 h-4 w-4" />
              Export PDF
            </Button>
            <Button 
              variant="outline" 
              onClick={() => handleExportExcel(activeTab)}
              className="bg-white/50 dark:bg-gray-800/50 hover:bg-green-50 hover:border-green-300 hover:text-green-700 transition-colors"
            >
              <Download className="mr-2 h-4 w-4" />
              Export Excel
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Pendapatan"
            value={formatCurrency(totalPendapatan)}
            subtitle="bulan ini"
            icon={TrendingUp}
            {...StatCardVariants.success}
          />
          <StatCard
            title="Unit Terjual"
            value={totalUnitTerjual.toString()}
            subtitle="produk terjual"
            icon={BarChart3}
            {...StatCardVariants.primary}
          />
          <StatCard
            title="Margin Rata-rata"
            value={`${avgMargin.toFixed(1)}%`}
            subtitle="profit margin"
            icon={PieChart}
            {...StatCardVariants.purple}
          />
          <StatCard
            title="Stok Rendah"
            value={stokRendah.toString()}
            subtitle="perlu perhatian"
            icon={AlertTriangle}
            {...StatCardVariants.warning}
          />
        </div>

        {/* Additional Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="bg-gradient-to-r from-indigo-50 to-indigo-100 dark:from-indigo-900/20 dark:to-indigo-800/20 border-indigo-200 dark:border-indigo-700">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-500 rounded-lg">
                  <Package className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="font-medium text-indigo-800 dark:text-indigo-200">
                    Nilai Stok: {formatCurrency(totalNilaiStok)}
                  </p>
                  <p className="text-sm text-indigo-600 dark:text-indigo-300">
                    Total aset produk jadi
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 border-red-200 dark:border-red-700">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-500 rounded-lg">
                  <Activity className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="font-medium text-red-800 dark:text-red-200">
                    Biaya Bahan: {formatCurrency(totalBiayaBahan)}
                  </p>
                  <p className="text-sm text-red-600 dark:text-red-300">
                    Total pengeluaran bahan baku
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-teal-50 to-teal-100 dark:from-teal-900/20 dark:to-teal-800/20 border-teal-200 dark:border-teal-700">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-teal-500 rounded-lg">
                  <TrendingUp className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="font-medium text-teal-800 dark:text-teal-200">
                    Laba Kotor: {formatCurrency(totalPendapatan - totalBiayaBahan)}
                  </p>
                  <p className="text-sm text-teal-600 dark:text-teal-300">
                    Pendapatan - biaya bahan
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Card */}
        <Card className="shadow-lg border-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
          <CardHeader className="border-b border-gray-200 dark:border-gray-700">
            {/* Tab Navigation */}
            <div className="flex flex-col space-y-4">
              <div className="border-b border-gray-200 dark:border-gray-700">
                <nav className="-mb-px flex space-x-8">
                  <button
                    onClick={() => setActiveTab('penjualan')}
                    className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                      activeTab === 'penjualan'
                        ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4" />
                      Laporan Penjualan
                    </div>
                  </button>
                  <button
                    onClick={() => setActiveTab('pemakaian')}
                    className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                      activeTab === 'pemakaian'
                        ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Activity className="w-4 h-4" />
                      Pemakaian Bahan Baku
                    </div>
                  </button>
                  <button
                    onClick={() => setActiveTab('stok')}
                    className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                      activeTab === 'stok'
                        ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4" />
                      Stok Tersedia
                    </div>
                  </button>
                </nav>
              </div>
              
              {/* Search and Filter */}
              <div className="flex flex-col space-y-3 md:flex-row md:items-center md:space-y-0 md:space-x-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Cari produk, SKU, atau bahan baku..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-white/50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={fetchAllData}
                    className="bg-white/50 dark:bg-gray-800/50"
                  >
                    <Activity className="mr-2 h-4 w-4" />
                    Refresh
                  </Button>
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-6">
            {/* Tab Content */}
            {activeTab === 'penjualan' && (
              <div className="space-y-4">
                {filteredPenjualan.length === 0 ? (
                  <div className="text-center py-12">
                    <TrendingUp className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Tidak ada data penjualan</h3>
                    <p className="text-gray-500 dark:text-gray-400">Belum ada transaksi penjualan yang tercatat.</p>
                  </div>
                ) : (
                  <DataTable
                    columns={salesColumns}
                    data={filteredPenjualan}
                    searchKey="nama_produk_jadi"
                    searchPlaceholder="Cari produk..."
                  />
                )}
              </div>
            )}

            {activeTab === 'pemakaian' && (
              <div className="space-y-4">
                {filteredPemakaian.length === 0 ? (
                  <div className="text-center py-12">
                    <Activity className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Tidak ada data pemakaian</h3>
                    <p className="text-gray-500 dark:text-gray-400">Belum ada pemakaian bahan baku yang tercatat.</p>
                  </div>
                ) : (
                  <DataTable
                    columns={materialColumns}
                    data={filteredPemakaian}
                    searchKey="nama_bahan_baku"
                    searchPlaceholder="Cari bahan baku..."
                  />
                )}
              </div>
            )}

            {activeTab === 'stok' && (
              <div className="space-y-4">
                {filteredStok.length === 0 ? (
                  <div className="text-center py-12">
                    <Package className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Tidak ada data stok</h3>
                    <p className="text-gray-500 dark:text-gray-400">Belum ada produk jadi yang terdaftar.</p>
                  </div>
                ) : (
                  <DataTable
                    columns={stockColumns}
                    data={filteredStok}
                    searchKey="nama_produk_jadi"
                    searchPlaceholder="Cari produk..."
                  />
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}