'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, FileText, DollarSign, Package, TrendingUp, Calculator } from 'lucide-react';
import { DataTable, SortableHeader } from '@/components/ui/data-table';
import { ColumnDef } from '@tanstack/react-table';
import { formatCurrency, formatDate } from '@/lib/utils';
import { StatCard, StatCardVariants } from '@/components/ui/stat-card';

// Interfaces
interface LaporanPenjualan {
  nama_produk_jadi: string;
  sku: string;
  total_terjual: number;
  total_pendapatan: number;
  periode: string;
  user_id: string;
}

interface PemakaianBahanWithCost {
  nama_bahan_baku: string;
  nama_unit: string;
  total_terpakai: number;
  periode: string;
  harga_per_unit: number;
  total_biaya: number;
  kategori: string;
  supplier: string;
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

interface DashboardReportsProps {
  laporanPenjualan: LaporanPenjualan[];
  laporanPemakaianBahan: PemakaianBahanWithCost[];
  stokTersedia: StokTersedia[];
  loading: boolean;
}

// Helper functions
const getStatusColor = (status: string) => {
  switch (status) {
    case 'Aman':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'Rendah':
      return 'bg-red-100 text-red-800 border-red-200';
    case 'Sedang':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

const getCategoryColor = (kategori: string) => {
  switch (kategori) {
    case 'Parfum':
      return 'bg-purple-100 text-purple-800 border-purple-200';
    case 'Body Mist':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'Base':
      return 'bg-gray-100 text-gray-800 border-gray-200';
    case 'Fragrance':
      return 'bg-pink-100 text-pink-800 border-pink-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

export function DashboardReports({ 
  laporanPenjualan, 
  laporanPemakaianBahan, 
  stokTersedia, 
  loading 
}: DashboardReportsProps) {
  const [activeTab, setActiveTab] = useState('penjualan');
  const [searchTerm, setSearchTerm] = useState('');

  // Column definitions
  const salesColumns: ColumnDef<LaporanPenjualan>[] = useMemo(() => [
    {
      accessorKey: 'nama_produk_jadi',
      header: ({ column }) => <SortableHeader column={column}>Produk</SortableHeader>,
      cell: ({ row }) => (
        <div className="font-medium">{row.getValue('nama_produk_jadi')}</div>
      ),
    },
    {
      accessorKey: 'sku',
      header: 'SKU',
      cell: ({ row }) => (
        <Badge variant="outline">{row.getValue('sku')}</Badge>
      ),
    },
    {
      accessorKey: 'total_terjual',
      header: ({ column }) => <SortableHeader column={column}>Unit Terjual</SortableHeader>,
      cell: ({ row }) => (
        <div className="text-right">{row.getValue('total_terjual')}</div>
      ),
    },
    {
      accessorKey: 'total_pendapatan',
      header: ({ column }) => <SortableHeader column={column}>Total Pendapatan</SortableHeader>,
      cell: ({ row }) => (
        <div className="text-right font-medium">
          {formatCurrency(row.getValue('total_pendapatan'))}
        </div>
      ),
    },
    {
      accessorKey: 'periode',
      header: ({ column }) => <SortableHeader column={column}>Periode</SortableHeader>,
      cell: ({ row }) => (
        <div>{formatDate(row.getValue('periode'))}</div>
      ),
    },
  ], []);

  const materialColumns: ColumnDef<PemakaianBahanWithCost>[] = useMemo(() => [
    {
      accessorKey: 'nama_bahan_baku',
      header: ({ column }) => <SortableHeader column={column}>Bahan Baku</SortableHeader>,
      cell: ({ row }) => (
        <div className="font-medium">{row.getValue('nama_bahan_baku')}</div>
      ),
    },
    {
      accessorKey: 'kategori',
      header: 'Kategori',
      cell: ({ row }) => (
        <Badge className={getCategoryColor(row.getValue('kategori'))}>
          {row.getValue('kategori')}
        </Badge>
      ),
    },
    {
      accessorKey: 'supplier',
      header: 'Supplier',
      cell: ({ row }) => (
        <div>{row.getValue('supplier')}</div>
      ),
    },
    {
      accessorKey: 'total_terpakai',
      header: ({ column }) => <SortableHeader column={column}>Total Terpakai</SortableHeader>,
      cell: ({ row }) => (
        <div className="text-right">
          {row.getValue('total_terpakai')} {row.original.nama_unit}
        </div>
      ),
    },
    {
      accessorKey: 'harga_per_unit',
      header: ({ column }) => <SortableHeader column={column}>Harga per Unit</SortableHeader>,
      cell: ({ row }) => (
        <div className="text-right">
          {formatCurrency(row.getValue('harga_per_unit'))}
        </div>
      ),
    },
    {
      accessorKey: 'total_biaya',
      header: ({ column }) => <SortableHeader column={column}>Total Biaya</SortableHeader>,
      cell: ({ row }) => (
        <div className="text-right font-medium">
          {formatCurrency(row.getValue('total_biaya'))}
        </div>
      ),
    },
  ], []);

  const stockColumns: ColumnDef<StokTersedia>[] = useMemo(() => [
    {
      accessorKey: 'nama_produk_jadi',
      header: ({ column }) => <SortableHeader column={column}>Produk</SortableHeader>,
      cell: ({ row }) => (
        <div className="font-medium">{row.getValue('nama_produk_jadi')}</div>
      ),
    },
    {
      accessorKey: 'sku',
      header: 'SKU',
      cell: ({ row }) => (
        <Badge variant="outline">{row.getValue('sku')}</Badge>
      ),
    },
    {
      accessorKey: 'stok_tersedia',
      header: ({ column }) => <SortableHeader column={column}>Stok Tersedia</SortableHeader>,
      cell: ({ row }) => (
        <div className="text-right">{row.getValue('stok_tersedia')}</div>
      ),
    },
    {
      accessorKey: 'min_stok',
      header: ({ column }) => <SortableHeader column={column}>Min. Stok</SortableHeader>,
      cell: ({ row }) => (
        <div className="text-right">{row.getValue('min_stok')}</div>
      ),
    },
    {
      accessorKey: 'harga_jual',
      header: ({ column }) => <SortableHeader column={column}>Harga Jual</SortableHeader>,
      cell: ({ row }) => (
        <div className="text-right">
          {formatCurrency(row.getValue('harga_jual'))}
        </div>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <Badge className={getStatusColor(row.getValue('status'))}>
          {row.getValue('status')}
        </Badge>
      ),
    },
  ], []);

  // Filter data based on search term
  const filteredSalesData = useMemo(() => {
    return laporanPenjualan.filter(item =>
      item.nama_produk_jadi.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.sku.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [laporanPenjualan, searchTerm]);

  const filteredMaterialData = useMemo(() => {
    return laporanPemakaianBahan.filter(item =>
      item.nama_bahan_baku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.kategori.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.supplier.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [laporanPemakaianBahan, searchTerm]);

  const filteredStockData = useMemo(() => {
    return stokTersedia.filter(item =>
      item.nama_produk_jadi.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.kategori.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [stokTersedia, searchTerm]);

  // Calculate summary data
  const totalStockValue = useMemo(() => {
    return stokTersedia.reduce((sum, item) => sum + (item.stok_tersedia * item.harga_jual), 0);
  }, [stokTersedia]);

  const totalMaterialCost = useMemo(() => {
    return laporanPemakaianBahan.reduce((sum, item) => sum + item.total_biaya, 0);
  }, [laporanPemakaianBahan]);

  const totalRevenue = useMemo(() => {
    return laporanPenjualan.reduce((sum, item) => sum + item.total_pendapatan, 0);
  }, [laporanPenjualan]);

  const grossProfit = totalRevenue - totalMaterialCost;

  const tabs = [
    { id: 'penjualan', label: 'Laporan Penjualan', count: laporanPenjualan.length },
    { id: 'bahan', label: 'Pemakaian Bahan Baku', count: laporanPemakaianBahan.length },
    { id: 'stok', label: 'Stok Tersedia', count: stokTersedia.length }
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-48 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Nilai Stok"
          value={formatCurrency(totalStockValue)}
          subtitle="nilai inventori"
          icon={Package}
          {...StatCardVariants.primary}
        />
        <StatCard
          title="Total Biaya Bahan"
          value={formatCurrency(totalMaterialCost)}
          subtitle="biaya operasional"
          icon={Calculator}
          {...StatCardVariants.danger}
        />
        <StatCard
          title="Total Pendapatan"
          value={formatCurrency(totalRevenue)}
          subtitle="penjualan kotor"
          icon={TrendingUp}
          {...StatCardVariants.success}
        />
        <StatCard
          title="Laba Kotor"
          value={formatCurrency(grossProfit)}
          subtitle="keuntungan bersih"
          icon={DollarSign}
          {...StatCardVariants.purple}
        />
      </div>

      {/* Reports Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Laporan Bisnis
            </CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Cari data..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Tab Navigation */}
          <div className="flex space-x-1 mb-6 border-b">
            {tabs.map((tab) => (
              <Button
                key={tab.id}
                variant={activeTab === tab.id ? "default" : "ghost"}
                onClick={() => setActiveTab(tab.id)}
                className="relative"
              >
                {tab.label}
                <Badge 
                  variant="secondary" 
                  className="ml-2 text-xs"
                >
                  {tab.count}
                </Badge>
              </Button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="min-h-[400px]">
            {activeTab === 'penjualan' && (
              <div>
                {filteredSalesData.length > 0 ? (
                  <DataTable
                    columns={salesColumns}
                    data={filteredSalesData}
                    searchKey="nama_produk_jadi"
                  />
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    Tidak ada data penjualan
                  </div>
                )}
              </div>
            )}

            {activeTab === 'bahan' && (
              <div>
                {filteredMaterialData.length > 0 ? (
                  <DataTable
                    columns={materialColumns}
                    data={filteredMaterialData}
                    searchKey="nama_bahan_baku"
                  />
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    Tidak ada data pemakaian bahan baku
                  </div>
                )}
              </div>
            )}

            {activeTab === 'stok' && (
              <div>
                {filteredStockData.length > 0 ? (
                  <DataTable
                    columns={stockColumns}
                    data={filteredStockData}
                    searchKey="nama_produk_jadi"
                  />
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    Tidak ada data stok tersedia
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export type { LaporanPenjualan, PemakaianBahanWithCost, StokTersedia };